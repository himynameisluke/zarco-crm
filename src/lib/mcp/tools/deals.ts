import { z } from "zod";
import { and, desc, eq, ilike } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { db } from "@/lib/db";
import {
  activities,
  contacts,
  deals,
  organizations,
  projects,
  quotes,
} from "@/lib/db/schema";
import { auditMcpWrite } from "../audit";
import { getMcpContext, textResult } from "../context";

const STAGE_VALUES = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

const TYPE_VALUES = ["engagement", "sale", "project", "retainer"] as const;

export function registerDealTools(server: McpServer) {
  server.registerTool(
    "find_deal",
    {
      description:
        "Search deals by name, optionally filtered by stage. Returns up to 20 matches with id, name, stage, value, and organization name.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Substring match against deal name"),
        stage: z
          .enum(STAGE_VALUES)
          .optional()
          .describe("Restrict to one pipeline stage"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ query, stage }, { authInfo }) => {
      getMcpContext(authInfo);
      const conditions = [ilike(deals.name, `%${query}%`)];
      if (stage) conditions.push(eq(deals.stage, stage));

      const rows = await db
        .select({
          id: deals.id,
          name: deals.name,
          type: deals.type,
          stage: deals.stage,
          valuePence: deals.valuePence,
          currency: deals.currency,
          closeDate: deals.closeDate,
          organizationName: organizations.name,
        })
        .from(deals)
        .leftJoin(organizations, eq(deals.organizationId, organizations.id))
        .where(and(...conditions))
        .orderBy(desc(deals.updatedAt))
        .limit(20);
      return textResult({ count: rows.length, deals: rows });
    },
  );

  server.registerTool(
    "get_deal",
    {
      description:
        "Get a deal with organization, primary contact, last 20 activities, projects, and quotes. Use this when you need the full picture for follow-up actions.",
      inputSchema: {
        id: z.string().uuid().describe("Deal UUID"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ id }, { authInfo }) => {
      getMcpContext(authInfo);

      const [deal] = await db
        .select({
          id: deals.id,
          name: deals.name,
          type: deals.type,
          stage: deals.stage,
          valuePence: deals.valuePence,
          currency: deals.currency,
          closeDate: deals.closeDate,
          createdAt: deals.createdAt,
          updatedAt: deals.updatedAt,
          organizationId: deals.organizationId,
          organizationName: organizations.name,
          primaryContactId: deals.primaryContactId,
        })
        .from(deals)
        .leftJoin(organizations, eq(deals.organizationId, organizations.id))
        .where(eq(deals.id, id))
        .limit(1);

      if (!deal) {
        return textResult({ error: "not_found", id });
      }

      const [primaryContact, dealActivities, dealProjects, dealQuotes] =
        await Promise.all([
          deal.primaryContactId
            ? db
                .select({
                  id: contacts.id,
                  firstName: contacts.firstName,
                  lastName: contacts.lastName,
                  email: contacts.email,
                  title: contacts.title,
                })
                .from(contacts)
                .where(eq(contacts.id, deal.primaryContactId))
                .limit(1)
                .then((rows) => rows[0] ?? null)
            : Promise.resolve(null),
          db
            .select({
              id: activities.id,
              type: activities.type,
              subject: activities.subject,
              body: activities.body,
              source: activities.source,
              occurredAt: activities.occurredAt,
            })
            .from(activities)
            .where(
              and(
                eq(activities.subjectType, "deal"),
                eq(activities.subjectId, id),
              ),
            )
            .orderBy(desc(activities.occurredAt))
            .limit(20),
          db
            .select({
              id: projects.id,
              name: projects.name,
              status: projects.status,
              startDate: projects.startDate,
              endDate: projects.endDate,
            })
            .from(projects)
            .where(eq(projects.dealId, id))
            .orderBy(desc(projects.updatedAt)),
          db
            .select({
              id: quotes.id,
              quoteNumber: quotes.quoteNumber,
              status: quotes.status,
              totalPence: quotes.totalPence,
              currency: quotes.currency,
              validUntil: quotes.validUntil,
              sentAt: quotes.sentAt,
              acceptedAt: quotes.acceptedAt,
            })
            .from(quotes)
            .where(eq(quotes.dealId, id))
            .orderBy(desc(quotes.createdAt)),
        ]);

      return textResult({
        deal,
        primary_contact: primaryContact,
        activities: dealActivities,
        projects: dealProjects,
        quotes: dealQuotes,
      });
    },
  );

  server.registerTool(
    "create_deal",
    {
      description:
        "Create a new deal. Name is required; everything else optional. valuePence is in integer pence (e.g. £15,000 = 1500000). Stage defaults to 'lead', type to 'sale'. Logs an audit activity.",
      inputSchema: {
        name: z.string().trim().min(1).max(200),
        type: z.enum(TYPE_VALUES).default("sale"),
        stage: z.enum(STAGE_VALUES).default("lead"),
        valuePence: z.number().int().min(0).max(1_000_000_000_00).optional(),
        currency: z.string().trim().length(3).default("GBP"),
        closeDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
          .optional(),
        organizationId: z.string().uuid().optional(),
        primaryContactId: z.string().uuid().optional(),
      },
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async (input, { authInfo }) => {
      const { userId } = getMcpContext(authInfo);
      const [inserted] = await db
        .insert(deals)
        .values({
          name: input.name,
          type: input.type,
          stage: input.stage,
          valuePence: input.valuePence ?? null,
          currency: input.currency,
          closeDate: input.closeDate ?? null,
          organizationId: input.organizationId ?? null,
          primaryContactId: input.primaryContactId ?? null,
          ownerId: userId,
        })
        .returning();

      await auditMcpWrite({
        type: "note",
        subjectType: "deal",
        subjectId: inserted.id,
        subject: `Created deal ${inserted.name}`,
        body: `Stage: ${inserted.stage} · Type: ${inserted.type}`,
        userId,
      });

      return textResult({ created: inserted });
    },
  );

  server.registerTool(
    "update_deal_stage",
    {
      description:
        "Move a deal to a different pipeline stage. Logs the stage change as an audit activity so it shows on the deal timeline.",
      inputSchema: {
        id: z.string().uuid(),
        stage: z.enum(STAGE_VALUES),
      },
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ id, stage }, { authInfo }) => {
      const { userId } = getMcpContext(authInfo);

      const [before] = await db
        .select({ name: deals.name, stage: deals.stage })
        .from(deals)
        .where(eq(deals.id, id))
        .limit(1);

      if (!before) {
        return textResult({ error: "not_found", id });
      }

      if (before.stage === stage) {
        return textResult({ unchanged: { id, stage } });
      }

      const [updated] = await db
        .update(deals)
        .set({ stage, updatedAt: new Date() })
        .where(eq(deals.id, id))
        .returning();

      await auditMcpWrite({
        type: "status_change",
        subjectType: "deal",
        subjectId: id,
        subject: `${before.stage} → ${stage}`,
        body: `Deal "${before.name}" moved from ${before.stage} to ${stage}`,
        userId,
        metadata: { fromStage: before.stage, toStage: stage },
      });

      return textResult({ updated });
    },
  );
}
