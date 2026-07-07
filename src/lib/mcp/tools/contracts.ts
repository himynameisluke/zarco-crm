import { z } from "zod";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { db } from "@/lib/db";
import { contracts, organizations } from "@/lib/db/schema";
import { auditMcpWrite } from "../audit";
import { requireMcpWorkspace, textResult } from "../context";
import { entityInWorkspace } from "../scope";

const STATUS_VALUES = ["active", "renewed", "lapsed", "cancelled"] as const;
const PERIOD_VALUES = ["monthly", "quarterly", "annual", "one_off"] as const;

export function registerContractTools(server: McpServer) {
  server.registerTool(
    "list_contracts",
    {
      description:
        "List contracts (retainers / recurring engagements) — the renewals book. Filters: status, dueWithinDays (contracts whose renewal endDate falls within N days — use this to answer 'what's up for renewal?'). Ordered by endDate ascending. Default limit 50, max 200.",
      inputSchema: {
        status: z.enum(STATUS_VALUES).optional(),
        dueWithinDays: z.number().int().min(1).max(730).optional(),
        limit: z.number().int().min(1).max(200).default(50),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ status, dueWithinDays, limit }, { authInfo }) => {
      const { workspaceId } = await requireMcpWorkspace(authInfo);

      const filters = [
        eq(contracts.workspaceId, workspaceId),
        status ? eq(contracts.status, status) : undefined,
        dueWithinDays
          ? lte(
              contracts.endDate,
              new Date(Date.now() + dueWithinDays * 24 * 60 * 60 * 1000)
                .toISOString()
                .slice(0, 10),
            )
          : undefined,
      ].filter(Boolean) as Parameters<typeof and>[number][];

      const rows = await db
        .select({
          id: contracts.id,
          name: contracts.name,
          status: contracts.status,
          valuePence: contracts.valuePence,
          currency: contracts.currency,
          billingPeriod: contracts.billingPeriod,
          startDate: contracts.startDate,
          endDate: contracts.endDate,
          autoRenew: contracts.autoRenew,
          renewalDealId: contracts.renewalDealId,
          organizationId: contracts.organizationId,
          organizationName: organizations.name,
          daysUntilRenewal: sql<number>`(${contracts.endDate} - current_date)::int`,
        })
        .from(contracts)
        .leftJoin(
          organizations,
          and(
            eq(contracts.organizationId, organizations.id),
            eq(organizations.workspaceId, workspaceId),
          ),
        )
        .where(and(...filters))
        .orderBy(asc(contracts.endDate))
        .limit(limit);

      return textResult({ count: rows.length, contracts: rows });
    },
  );

  server.registerTool(
    "create_contract",
    {
      description:
        "Create a contract (retainer / recurring engagement) to track its renewal. valuePence is per billing period, in integer pence. endDate is the renewal date — the /renewals view and list_contracts dueWithinDays key on it. Dates are YYYY-MM-DD.",
      inputSchema: {
        name: z.string().trim().min(1).max(200),
        organizationId: z.string().uuid().optional(),
        dealId: z
          .string()
          .uuid()
          .optional()
          .describe("The won deal this contract came from"),
        status: z.enum(STATUS_VALUES).default("active"),
        valuePence: z.number().int().min(0).max(1_000_000_000_00).optional(),
        currency: z.string().trim().length(3).default("GBP"),
        billingPeriod: z.enum(PERIOD_VALUES).default("monthly"),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
        autoRenew: z.boolean().default(false),
        notes: z.string().trim().max(5000).optional(),
      },
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async (input, { authInfo }) => {
      const { userId, workspaceId } = await requireMcpWorkspace(authInfo);

      if (input.endDate < input.startDate) {
        return textResult({
          error: "invalid_dates",
          message: "endDate (renewal date) must be after startDate",
        });
      }
      if (
        input.organizationId &&
        !(await entityInWorkspace("organization", input.organizationId, workspaceId))
      ) {
        return textResult({
          error: "invalid_reference",
          message: "organizationId does not exist in this workspace",
        });
      }
      if (
        input.dealId &&
        !(await entityInWorkspace("deal", input.dealId, workspaceId))
      ) {
        return textResult({
          error: "invalid_reference",
          message: "dealId does not exist in this workspace",
        });
      }

      const [inserted] = await db
        .insert(contracts)
        .values({
          workspaceId,
          name: input.name,
          organizationId: input.organizationId ?? null,
          dealId: input.dealId ?? null,
          status: input.status,
          valuePence: input.valuePence ?? null,
          currency: input.currency,
          billingPeriod: input.billingPeriod,
          startDate: input.startDate,
          endDate: input.endDate,
          autoRenew: input.autoRenew,
          notes: input.notes ?? null,
          ownerId: userId,
        })
        .returning();

      if (input.dealId) {
        await auditMcpWrite({
          workspaceId,
          type: "note",
          subjectType: "deal",
          subjectId: input.dealId,
          subject: `Contract "${inserted.name}" created from this deal`,
          body: `Runs ${inserted.startDate} → ${inserted.endDate} (renewal date)`,
          userId,
          metadata: { contractId: inserted.id },
        });
      }

      return textResult({ created: inserted });
    },
  );

  server.registerTool(
    "update_contract",
    {
      description:
        "Update a contract's editable fields. Pass only what you want to change. Use status='renewed' once the renewal closes, 'lapsed'/'cancelled' when it ends.",
      inputSchema: {
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(200).optional(),
        status: z.enum(STATUS_VALUES).optional(),
        valuePence: z.number().int().min(0).max(1_000_000_000_00).optional(),
        billingPeriod: z.enum(PERIOD_VALUES).optional(),
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
          .optional(),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
          .optional(),
        autoRenew: z.boolean().optional(),
        notes: z.string().trim().max(5000).nullable().optional(),
      },
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ id, ...patch }, { authInfo }) => {
      const { userId, workspaceId } = await requireMcpWorkspace(authInfo);

      const updateValues: Record<string, unknown> = { updatedAt: new Date() };
      if (patch.name !== undefined) updateValues.name = patch.name;
      if (patch.status !== undefined) updateValues.status = patch.status;
      if (patch.valuePence !== undefined) updateValues.valuePence = patch.valuePence;
      if (patch.billingPeriod !== undefined)
        updateValues.billingPeriod = patch.billingPeriod;
      if (patch.startDate !== undefined) updateValues.startDate = patch.startDate;
      if (patch.endDate !== undefined) updateValues.endDate = patch.endDate;
      if (patch.autoRenew !== undefined) updateValues.autoRenew = patch.autoRenew;
      if (patch.notes !== undefined) updateValues.notes = patch.notes;

      const [updated] = await db
        .update(contracts)
        .set(updateValues)
        .where(and(eq(contracts.id, id), eq(contracts.workspaceId, workspaceId)))
        .returning();

      if (!updated) return textResult({ error: "not_found", id });

      if (updated.dealId) {
        const changed = Object.keys(updateValues).filter((k) => k !== "updatedAt");
        await auditMcpWrite({
          workspaceId,
          type: "note",
          subjectType: "deal",
          subjectId: updated.dealId,
          subject: `Contract "${updated.name}" updated`,
          body: changed.length ? `Changed: ${changed.join(", ")}` : undefined,
          userId,
          metadata: { contractId: id },
        });
      }

      return textResult({ updated });
    },
  );
}
