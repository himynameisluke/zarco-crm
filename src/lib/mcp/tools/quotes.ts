import { z } from "zod";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { db } from "@/lib/db";
import {
  contacts,
  deals,
  organizations,
  quoteLineItems,
  quotes,
} from "@/lib/db/schema";
import { auditMcpWrite } from "../audit";
import { requireMcpWorkspace, textResult } from "../context";
import { entityInWorkspace } from "../scope";
import { nextQuoteNumber } from "@/lib/quotes/number";
import {
  computeTotalsPence,
  lineTotalPence,
  totalWithTaxPence,
} from "@/lib/quotes/totals";

const STATUS_VALUES = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "expired",
] as const;

const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.number().min(0).default(1),
  unitPricePence: z.number().int().min(0).max(1_000_000_000_00),
});

export function registerQuoteTools(server: McpServer) {
  server.registerTool(
    "create_quote",
    {
      description:
        "Create a draft quote with line items. dealId AND organizationId are required (quotes must trace back to a pipeline deal). contactId is optional. Quote number is auto-generated (Q-NNNN). Subtotal + total are computed from the line items + tax rate. Status starts at 'draft'; use send_quote to send. unitPricePence is integer pence (£15.50 = 1550). taxRate is decimal (0.2 = 20%).",
      inputSchema: {
        dealId: z.string().uuid(),
        organizationId: z.string().uuid(),
        contactId: z.string().uuid().optional(),
        currency: z.string().trim().length(3).default("GBP"),
        taxRate: z.number().min(0).max(1).default(0),
        validUntil: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
          .optional(),
        notes: z.string().trim().max(5000).optional(),
        lineItems: z.array(lineItemSchema).min(1).max(100),
      },
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async (input, { authInfo }) => {
      const { userId, workspaceId } = await requireMcpWorkspace(authInfo);

      if (!(await entityInWorkspace("deal", input.dealId, workspaceId))) {
        return textResult({
          error: "invalid_reference",
          message: "dealId does not exist in this workspace",
        });
      }
      if (
        !(await entityInWorkspace("organization", input.organizationId, workspaceId))
      ) {
        return textResult({
          error: "invalid_reference",
          message: "organizationId does not exist in this workspace",
        });
      }
      if (
        input.contactId &&
        !(await entityInWorkspace("contact", input.contactId, workspaceId))
      ) {
        return textResult({
          error: "invalid_reference",
          message: "contactId does not exist in this workspace",
        });
      }

      const { subtotalPence, totalPence } = computeTotalsPence(
        input.lineItems,
        input.taxRate,
      );
      // One transaction: atomic number allocation + quote + line items
      // commit or roll back together.
      const { inserted, lineRows } = await db.transaction(async (tx) => {
        const quoteNumber = await nextQuoteNumber(workspaceId, tx);

        const [quote] = await tx
          .insert(quotes)
          .values({
            workspaceId,
            quoteNumber,
            dealId: input.dealId,
            organizationId: input.organizationId,
            contactId: input.contactId ?? null,
            status: "draft",
            subtotalPence,
            taxRate: String(input.taxRate),
            totalPence,
            currency: input.currency,
            validUntil: input.validUntil ?? null,
            notes: input.notes ?? null,
            createdBy: userId,
          })
          .returning();

        // Insert line items in batch with sort order matching the input array.
        const items = await tx
          .insert(quoteLineItems)
          .values(
            input.lineItems.map((li, i) => ({
              workspaceId,
              quoteId: quote.id,
              description: li.description,
              quantity: String(li.quantity),
              unitPricePence: li.unitPricePence,
              totalPence: lineTotalPence(li),
              sortOrder: i,
            })),
          )
          .returning();

        return { inserted: quote, lineRows: items };
      });

      // Attribute on the deal timeline. dealId is always set now (required).
      await auditMcpWrite({
        workspaceId,
        type: "note",
        subjectType: "deal",
        subjectId: inserted.dealId,
        subject: `Created quote ${inserted.quoteNumber}`,
        body: `Total: ${inserted.currency} ${(inserted.totalPence / 100).toFixed(2)} · ${input.lineItems.length} line item${input.lineItems.length === 1 ? "" : "s"}`,
        userId,
      });

      return textResult({
        created: { ...inserted, lineItems: lineRows },
      });
    },
  );

  server.registerTool(
    "list_quotes",
    {
      description:
        "List quotes with optional filters. Filters: status, dealId, organizationId. Default limit 50.",
      inputSchema: {
        status: z.enum(STATUS_VALUES).optional(),
        dealId: z.string().uuid().optional(),
        organizationId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(200).default(50),
      },
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ status, dealId, organizationId, limit }, { authInfo }) => {
      const { workspaceId } = await requireMcpWorkspace(authInfo);
      const filters = [
        eq(quotes.workspaceId, workspaceId),
        status ? eq(quotes.status, status) : undefined,
        dealId ? eq(quotes.dealId, dealId) : undefined,
        organizationId ? eq(quotes.organizationId, organizationId) : undefined,
      ].filter(Boolean) as Parameters<typeof and>[number][];

      const rows = await db
        .select({
          id: quotes.id,
          quoteNumber: quotes.quoteNumber,
          status: quotes.status,
          subtotalPence: quotes.subtotalPence,
          totalPence: quotes.totalPence,
          currency: quotes.currency,
          dealId: quotes.dealId,
          organizationId: quotes.organizationId,
          organizationName: organizations.name,
          contactId: quotes.contactId,
          validUntil: quotes.validUntil,
          createdAt: quotes.createdAt,
        })
        .from(quotes)
        .leftJoin(
          organizations,
          and(
            eq(quotes.organizationId, organizations.id),
            eq(organizations.workspaceId, workspaceId),
          ),
        )
        .where(and(...filters))
        .orderBy(desc(quotes.createdAt))
        .limit(limit);

      return textResult({ count: rows.length, quotes: rows });
    },
  );

  server.registerTool(
    "get_quote",
    {
      description:
        "Get a single quote with its line items, plus linked deal/org/contact references.",
      inputSchema: {
        id: z.string().uuid(),
      },
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ id }, { authInfo }) => {
      const { workspaceId } = await requireMcpWorkspace(authInfo);
      const [quote] = await db
        .select()
        .from(quotes)
        .where(and(eq(quotes.id, id), eq(quotes.workspaceId, workspaceId)))
        .limit(1);
      if (!quote) return textResult({ error: "not_found", id });

      const items = await db
        .select()
        .from(quoteLineItems)
        .where(
          and(
            eq(quoteLineItems.quoteId, id),
            eq(quoteLineItems.workspaceId, workspaceId),
          ),
        )
        .orderBy(asc(quoteLineItems.sortOrder));

      const [linkedDeal] = quote.dealId
        ? await db
            .select({ id: deals.id, name: deals.name })
            .from(deals)
            .where(
              and(eq(deals.id, quote.dealId), eq(deals.workspaceId, workspaceId)),
            )
            .limit(1)
        : [null];
      const [linkedOrg] = quote.organizationId
        ? await db
            .select({ id: organizations.id, name: organizations.name })
            .from(organizations)
            .where(
              and(
                eq(organizations.id, quote.organizationId),
                eq(organizations.workspaceId, workspaceId),
              ),
            )
            .limit(1)
        : [null];
      const [linkedContact] = quote.contactId
        ? await db
            .select({
              id: contacts.id,
              firstName: contacts.firstName,
              lastName: contacts.lastName,
              email: contacts.email,
            })
            .from(contacts)
            .where(
              and(
                eq(contacts.id, quote.contactId),
                eq(contacts.workspaceId, workspaceId),
              ),
            )
            .limit(1)
        : [null];

      return textResult({
        quote,
        lineItems: items,
        deal: linkedDeal,
        organization: linkedOrg,
        contact: linkedContact,
      });
    },
  );

  server.registerTool(
    "update_quote",
    {
      description:
        "Update an existing DRAFT quote. Pass only the fields you want to change. If you include `lineItems`, ALL existing line items are replaced. Subtotal/total are recomputed whenever lineItems or taxRate change. Sent/accepted quotes can't be edited (their public page is live) — create a new quote instead.",
      inputSchema: {
        id: z.string().uuid(),
        currency: z.string().trim().length(3).optional(),
        taxRate: z.number().min(0).max(1).optional(),
        validUntil: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
          .nullable()
          .optional(),
        notes: z.string().trim().max(5000).nullable().optional(),
        // dealId + organizationId are NOT NULL in the DB — re-assign only.
        dealId: z.string().uuid().optional(),
        organizationId: z.string().uuid().optional(),
        contactId: z.string().uuid().nullable().optional(),
        lineItems: z.array(lineItemSchema).min(1).max(100).optional(),
      },
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ id, lineItems, ...patch }, { authInfo }) => {
      const { userId, workspaceId } = await requireMcpWorkspace(authInfo);

      const [existing] = await db
        .select()
        .from(quotes)
        .where(and(eq(quotes.id, id), eq(quotes.workspaceId, workspaceId)))
        .limit(1);
      if (!existing) return textResult({ error: "not_found", id });

      // Draft-only, matching the web updateQuote action: once sent, the
      // recipient may have seen (or accepted!) the numbers on the public
      // page, so silently re-pricing would make that page lie.
      if (existing.status !== "draft") {
        return textResult({
          error: "invalid_state",
          message: `Quote is ${existing.status} — only drafts can be edited. Create a new quote instead.`,
        });
      }

      if (patch.dealId && !(await entityInWorkspace("deal", patch.dealId, workspaceId))) {
        return textResult({
          error: "invalid_reference",
          message: "dealId does not exist in this workspace",
        });
      }
      if (
        patch.organizationId &&
        !(await entityInWorkspace("organization", patch.organizationId, workspaceId))
      ) {
        return textResult({
          error: "invalid_reference",
          message: "organizationId does not exist in this workspace",
        });
      }
      if (
        patch.contactId &&
        !(await entityInWorkspace("contact", patch.contactId, workspaceId))
      ) {
        return textResult({
          error: "invalid_reference",
          message: "contactId does not exist in this workspace",
        });
      }

      const updateValues: Record<string, unknown> = { updatedAt: new Date() };
      if (patch.currency !== undefined) updateValues.currency = patch.currency;
      if (patch.taxRate !== undefined) updateValues.taxRate = String(patch.taxRate);
      if (patch.validUntil !== undefined) updateValues.validUntil = patch.validUntil;
      if (patch.notes !== undefined) updateValues.notes = patch.notes;
      if (patch.dealId !== undefined) updateValues.dealId = patch.dealId;
      if (patch.organizationId !== undefined)
        updateValues.organizationId = patch.organizationId;
      if (patch.contactId !== undefined) updateValues.contactId = patch.contactId;

      // Totals must track their inputs: a full recompute when line items are
      // replaced, and a tax-only recompute from the stored subtotal when just
      // the rate moves (this used to leave totalPence stale).
      if (lineItems) {
        const effectiveTaxRate =
          patch.taxRate !== undefined
            ? patch.taxRate
            : Number(existing.taxRate);
        const totals = computeTotalsPence(lineItems, effectiveTaxRate);
        updateValues.subtotalPence = totals.subtotalPence;
        updateValues.totalPence = totals.totalPence;
      } else if (patch.taxRate !== undefined) {
        updateValues.totalPence = totalWithTaxPence(
          existing.subtotalPence,
          patch.taxRate,
        );
      }

      // One transaction — a failure between "delete items" and "insert items"
      // must not leave a quote with new totals and zero line items.
      const [updated] = await db.transaction(async (tx) => {
        if (lineItems) {
          await tx
            .delete(quoteLineItems)
            .where(
              and(
                eq(quoteLineItems.quoteId, id),
                eq(quoteLineItems.workspaceId, workspaceId),
              ),
            );
          await tx.insert(quoteLineItems).values(
            lineItems.map((li, i) => ({
              quoteId: id,
              // Line items inherit the parent quote's workspace (defense in
              // depth — every workspace-scoped table carries its own FK).
              workspaceId: existing.workspaceId,
              description: li.description,
              quantity: String(li.quantity),
              unitPricePence: li.unitPricePence,
              totalPence: lineTotalPence(li),
              sortOrder: i,
            })),
          );
        }

        return tx
          .update(quotes)
          .set(updateValues)
          .where(and(eq(quotes.id, id), eq(quotes.workspaceId, workspaceId)))
          .returning();
      });

      const changedFields = Object.keys(updateValues).filter(
        (k) => k !== "updatedAt",
      );
      if (lineItems) changedFields.push(`lineItems(${lineItems.length})`);

      await auditMcpWrite({
        workspaceId,
        type: "note",
        subjectType: "deal",
        // dealId is NOT NULL in the DB, so the deal timeline always exists.
        subjectId: updated.dealId,
        subject: `Updated quote ${updated.quoteNumber}`,
        body:
          changedFields.length > 0
            ? `Changed: ${changedFields.join(", ")}`
            : undefined,
        userId,
      });

      return textResult({ updated });
    },
  );
}
