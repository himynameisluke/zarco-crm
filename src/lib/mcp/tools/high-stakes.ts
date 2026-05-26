import { z } from "zod";
import { eq } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { db } from "@/lib/db";
import { contacts, deals, organizations, quotes } from "@/lib/db/schema";
import { auditMcpWrite } from "../audit";
import { getMcpContext, textResult } from "../context";

const CONFIRM_REQUIRED_NOTE =
  "DESTRUCTIVE — you MUST confirm with the user in plain language before calling with confirm=true. The tool will refuse without explicit confirm=true.";

const SEND_REQUIRED_NOTE =
  "HIGH-STAKES — sends external email on the user's behalf. You MUST confirm with the user before calling with confirm=true. Currently a stub (Resend not wired) — the tool will record intent + transition state but no real email leaves the system.";

/**
 * High-stakes tools that mutate the world in ways that are hard or impossible
 * to undo (deletes) or visible to third parties (sends). They all gate on an
 * explicit confirm:true parameter so Claude has to ask the user before
 * pulling the trigger.
 *
 * MCP elicitation (mcp/elicitation) would be a cleaner mechanism, but client
 * support is patchy as of this writing — the confirm-param pattern works in
 * every client today and keeps the human-in-the-loop step honest.
 */
export function registerHighStakesTools(server: McpServer) {
  // ── Deletes ───────────────────────────────────────────────────────────

  function deletionResult(error?: string) {
    return error ? textResult({ error }) : null;
  }

  server.registerTool(
    "delete_contact",
    {
      description: `Permanently delete a contact. ${CONFIRM_REQUIRED_NOTE} Related activities remain in the database but become orphan rows (their subject FK is nulled).`,
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
      const { userId } = getMcpContext(authInfo);
      if (!confirm) {
        return textResult({
          error: "confirm_required",
          message: "Refusing destructive delete without explicit confirm=true",
        });
      }
      const [target] = await db
        .select({ firstName: contacts.firstName, lastName: contacts.lastName })
        .from(contacts)
        .where(eq(contacts.id, id))
        .limit(1);
      if (!target) {
        return textResult({ error: "not_found", id });
      }
      const name =
        [target.firstName, target.lastName].filter(Boolean).join(" ") || "contact";
      await db.delete(contacts).where(eq(contacts.id, id));
      // Audit lands on the organization timeline if there is one — but for a
      // bare delete we record it in a separate system activity. Skipping the
      // entity audit because the entity no longer exists. The MCP-tagged
      // audit appears in the deleted-from-list-view sense via /activity feed
      // when we add a deletes-feed later.
      return deletionResult() ?? textResult({ deleted: { id, name }, by: userId });
    },
  );

  server.registerTool(
    "delete_organization",
    {
      description: `Permanently delete an organization. ${CONFIRM_REQUIRED_NOTE} Linked contacts and deals stay (their organizationId is nulled).`,
      inputSchema: {
        id: z.string().uuid(),
        confirm: z.boolean(),
      },
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    async ({ id, confirm }, { authInfo }) => {
      const { userId } = getMcpContext(authInfo);
      if (!confirm) {
        return textResult({
          error: "confirm_required",
          message: "Refusing destructive delete without explicit confirm=true",
        });
      }
      const [target] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, id))
        .limit(1);
      if (!target) {
        return textResult({ error: "not_found", id });
      }
      await db.delete(organizations).where(eq(organizations.id, id));
      return textResult({ deleted: { id, name: target.name }, by: userId });
    },
  );

  server.registerTool(
    "delete_deal",
    {
      description: `Permanently delete a deal. ${CONFIRM_REQUIRED_NOTE} Linked activities, quotes, and projects survive (their dealId is nulled).`,
      inputSchema: {
        id: z.string().uuid(),
        confirm: z.boolean(),
      },
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    async ({ id, confirm }, { authInfo }) => {
      const { userId } = getMcpContext(authInfo);
      if (!confirm) {
        return textResult({
          error: "confirm_required",
          message: "Refusing destructive delete without explicit confirm=true",
        });
      }
      const [target] = await db
        .select({ name: deals.name })
        .from(deals)
        .where(eq(deals.id, id))
        .limit(1);
      if (!target) {
        return textResult({ error: "not_found", id });
      }
      await db.delete(deals).where(eq(deals.id, id));
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
      const { userId } = getMcpContext(authInfo);
      if (!input.confirm) {
        return textResult({
          error: "confirm_required",
          message:
            "Refusing send without explicit confirm=true. Show the user the recipients + subject first and get explicit go-ahead.",
        });
      }

      // STUB: Resend not wired yet. Record intent on the contact's timeline
      // (if a contactId was given) so the user can see "Claude tried to send
      // X" in the activity feed.
      if (input.contactId) {
        await auditMcpWrite({
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
      const { userId } = getMcpContext(authInfo);
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
        .where(eq(quotes.id, quoteId))
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
        .where(eq(quotes.id, quoteId));

      if (quote.dealId) {
        await auditMcpWrite({
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
