import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { db } from "@/lib/db";
import { activities, contacts, deals, organizations, quotes, tasks } from "@/lib/db/schema";
import { auditMcpWrite } from "../audit";
import { requireMcpWorkspace, textResult } from "../context";
import { entityInWorkspace } from "../scope";

const CONFIRM_REQUIRED_NOTE =
  "DESTRUCTIVE — you MUST confirm with the user in plain language before calling with confirm=true. The tool will refuse without explicit confirm=true.";

const SEND_REQUIRED_NOTE =
  "HIGH-STAKES — sends external email on the user's behalf. You MUST confirm with the user before calling with confirm=true. No email is delivered yet (Resend not wired), but this is NOT side-effect-free: transitioning a quote to 'sent' makes its public /q/[token] link and PDF live to anyone holding the URL. Treat it as publishing the quote.";

/**
 * High-stakes tools that mutate the world in ways that are hard or impossible
 * to undo (deletes) or visible to third parties (sends). They all gate on an
 * explicit confirm:true parameter so Claude has to ask the user before
 * pulling the trigger.
 *
 * MCP elicitation (mcp/elicitation) would be a cleaner mechanism, but client
 * support is patchy as of this writing — the confirm-param pattern works in
 * every client today and keeps the human-in-the-loop step honest.
 *
 * Every query is scoped to the caller's workspace (requireMcpWorkspace): a
 * delete/send can only touch rows in the workspace the token is bound to.
 */
export function registerHighStakesTools(server: McpServer) {
  // ── Deletes ───────────────────────────────────────────────────────────

  server.registerTool(
    "delete_contact",
    {
      description: `Permanently delete a contact. ${CONFIRM_REQUIRED_NOTE} Related activities and tasks on the contact are deleted with it.`,
      inputSchema: {
        id: z.string().uuid(),
        confirm: z
          .boolean()
          .describe(
            "Must be true. Set only after explicit user confirmation in conversation.",
          ),
      },
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    async ({ id, confirm }, { authInfo }) => {
      const { userId, workspaceId } = await requireMcpWorkspace(authInfo);
      if (!confirm) {
        return textResult({
          error: "confirm_required",
          message: "Refusing destructive delete without explicit confirm=true",
        });
      }
      const [target] = await db
        .select({ firstName: contacts.firstName, lastName: contacts.lastName })
        .from(contacts)
        .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)))
        .limit(1);
      if (!target) {
        return textResult({ error: "not_found", id });
      }
      const name =
        [target.firstName, target.lastName].filter(Boolean).join(" ") || "contact";
      // Activities/tasks reference subjects polymorphically (no FK) — clean
      // them up with the row or they orphan forever.
      await db.transaction(async (tx) => {
        await tx
          .delete(activities)
          .where(
            and(
              eq(activities.workspaceId, workspaceId),
              eq(activities.subjectType, "contact"),
              eq(activities.subjectId, id),
            ),
          );
        await tx
          .delete(tasks)
          .where(
            and(
              eq(tasks.workspaceId, workspaceId),
              eq(tasks.subjectType, "contact"),
              eq(tasks.subjectId, id),
            ),
          );
        await tx
          .delete(contacts)
          .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)));
      });
      // Audit is skipped for a bare delete: the entity no longer exists to
      // attach a timeline row to. A deletes feed can surface these later.
      return textResult({ deleted: { id, name }, by: userId });
    },
  );

  server.registerTool(
    "delete_organization",
    {
      description: `Permanently delete an organization. ${CONFIRM_REQUIRED_NOTE} Linked contacts and deals stay (their organizationId is nulled); the org's own activities/tasks are deleted with it. Refuses if the org still has quotes.`,
      inputSchema: {
        id: z.string().uuid(),
        confirm: z.boolean(),
      },
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    async ({ id, confirm }, { authInfo }) => {
      const { userId, workspaceId } = await requireMcpWorkspace(authInfo);
      if (!confirm) {
        return textResult({
          error: "confirm_required",
          message: "Refusing destructive delete without explicit confirm=true",
        });
      }
      const [target] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(
          and(eq(organizations.id, id), eq(organizations.workspaceId, workspaceId)),
        )
        .limit(1);
      if (!target) {
        return textResult({ error: "not_found", id });
      }
      // quotes.organizationId is NOT NULL + restrict — surface the block
      // instead of letting the FK violation bubble as a raw error.
      const [{ n: orgQuoteCount }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(quotes)
        .where(
          and(eq(quotes.organizationId, id), eq(quotes.workspaceId, workspaceId)),
        );
      if (orgQuoteCount > 0) {
        return textResult({
          error: "has_quotes",
          message: `Organization has ${orgQuoteCount} quote(s) — delete or re-assign them first`,
        });
      }
      await db.transaction(async (tx) => {
        await tx
          .delete(activities)
          .where(
            and(
              eq(activities.workspaceId, workspaceId),
              eq(activities.subjectType, "organization"),
              eq(activities.subjectId, id),
            ),
          );
        await tx
          .delete(tasks)
          .where(
            and(
              eq(tasks.workspaceId, workspaceId),
              eq(tasks.subjectType, "organization"),
              eq(tasks.subjectId, id),
            ),
          );
        await tx
          .delete(organizations)
          .where(
            and(eq(organizations.id, id), eq(organizations.workspaceId, workspaceId)),
          );
      });
      return textResult({ deleted: { id, name: target.name }, by: userId });
    },
  );

  server.registerTool(
    "delete_deal",
    {
      description: `Permanently delete a deal. ${CONFIRM_REQUIRED_NOTE} The deal's activities/tasks are deleted with it; projects survive (dealId nulled). Refuses if the deal still has quotes.`,
      inputSchema: {
        id: z.string().uuid(),
        confirm: z.boolean(),
      },
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    async ({ id, confirm }, { authInfo }) => {
      const { userId, workspaceId } = await requireMcpWorkspace(authInfo);
      if (!confirm) {
        return textResult({
          error: "confirm_required",
          message: "Refusing destructive delete without explicit confirm=true",
        });
      }
      const [target] = await db
        .select({ name: deals.name })
        .from(deals)
        .where(and(eq(deals.id, id), eq(deals.workspaceId, workspaceId)))
        .limit(1);
      if (!target) {
        return textResult({ error: "not_found", id });
      }
      const [{ n: dealQuoteCount }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(quotes)
        .where(and(eq(quotes.dealId, id), eq(quotes.workspaceId, workspaceId)));
      if (dealQuoteCount > 0) {
        return textResult({
          error: "has_quotes",
          message: `Deal has ${dealQuoteCount} quote(s) — delete them first`,
        });
      }
      await db.transaction(async (tx) => {
        await tx
          .delete(activities)
          .where(
            and(
              eq(activities.workspaceId, workspaceId),
              eq(activities.subjectType, "deal"),
              eq(activities.subjectId, id),
            ),
          );
        await tx
          .delete(tasks)
          .where(
            and(
              eq(tasks.workspaceId, workspaceId),
              eq(tasks.subjectType, "deal"),
              eq(tasks.subjectId, id),
            ),
          );
        await tx
          .delete(deals)
          .where(and(eq(deals.id, id), eq(deals.workspaceId, workspaceId)));
      });
      return textResult({ deleted: { id, name: target.name }, by: userId });
    },
  );

  // ── Sends ─────────────────────────────────────────────────────────────

  server.registerTool(
    "send_email",
    {
      description: `Send an email to one or more recipients on the user's behalf. ${SEND_REQUIRED_NOTE}`,
      inputSchema: {
        to: z.array(z.string().email()).min(1).max(50),
        subject: z.string().trim().min(1).max(500),
        body: z.string().trim().min(1).max(100_000),
        contactId: z
          .string()
          .uuid()
          .optional()
          .describe(
            "Optional: if the recipient maps to a CRM contact, pass their ID so the audit lands on their timeline",
          ),
        confirm: z.boolean(),
      },
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async (input, { authInfo }) => {
      const { userId, workspaceId } = await requireMcpWorkspace(authInfo);
      if (!input.confirm) {
        return textResult({
          error: "confirm_required",
          message:
            "Refusing send without explicit confirm=true. Show the user the recipients + subject first and get explicit go-ahead.",
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

      // STUB: Resend not wired yet. Record intent on the contact's timeline
      // (if a contactId was given) so the user can see "Claude tried to send
      // X" in the activity feed.
      if (input.contactId) {
        await auditMcpWrite({
          workspaceId,
          type: "email",
          subjectType: "contact",
          subjectId: input.contactId,
          subject: `Drafted email: ${input.subject}`,
          body: `To: ${input.to.join(", ")}\n\n${input.body}\n\n— stub: no email actually sent (Resend not wired)`,
          userId,
          metadata: { to: input.to, subject: input.subject, stubbed: true },
        });
      }

      return textResult({
        stubbed: true,
        message:
          "Email intent recorded. Real delivery ships once a Resend API key + verified domain are wired.",
        would_have_sent: {
          to: input.to,
          subject: input.subject,
        },
      });
    },
  );

  server.registerTool(
    "send_quote",
    {
      description: `Send a quote to its recipient and transition status to 'sent'. ${SEND_REQUIRED_NOTE}`,
      inputSchema: {
        quoteId: z.string().uuid(),
        confirm: z.boolean(),
      },
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ quoteId, confirm }, { authInfo }) => {
      const { userId, workspaceId } = await requireMcpWorkspace(authInfo);
      if (!confirm) {
        return textResult({
          error: "confirm_required",
          message:
            "Refusing send without explicit confirm=true. Show the user the quote total + recipient first.",
        });
      }

      const [quote] = await db
        .select({
          id: quotes.id,
          quoteNumber: quotes.quoteNumber,
          status: quotes.status,
          totalPence: quotes.totalPence,
          currency: quotes.currency,
          dealId: quotes.dealId,
        })
        .from(quotes)
        .where(and(eq(quotes.id, quoteId), eq(quotes.workspaceId, workspaceId)))
        .limit(1);

      if (!quote) {
        return textResult({ error: "not_found", id: quoteId });
      }
      if (quote.status !== "draft") {
        return textResult({
          error: "invalid_state",
          message: `Quote is already ${quote.status}; can only send drafts`,
        });
      }

      await db
        .update(quotes)
        .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
        .where(and(eq(quotes.id, quoteId), eq(quotes.workspaceId, workspaceId)));

      if (quote.dealId) {
        await auditMcpWrite({
          workspaceId,
          type: "quote_sent",
          subjectType: "deal",
          subjectId: quote.dealId,
          subject: `Sent quote ${quote.quoteNumber}`,
          body: `Total ${quote.totalPence / 100} ${quote.currency} — stub: status transitioned but no email actually delivered (Resend not wired)`,
          userId,
          metadata: {
            quoteId,
            quoteNumber: quote.quoteNumber,
            totalPence: quote.totalPence,
            stubbed: true,
          },
        });
      }

      return textResult({
        stubbed: true,
        message:
          "Quote marked as sent. Real email delivery ships once Resend is wired — for now copy the public link from /quotes/[id] and paste into Outlook.",
        quote: { id: quoteId, quoteNumber: quote.quoteNumber },
      });
    },
  );
}
