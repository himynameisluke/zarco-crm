import { z } from "zod";
import { and, desc, eq, gte, ilike, sql } from "drizzle-orm";
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
import { requireMcpWorkspace, textResult } from "../context";
import { entityInWorkspace } from "../scope";
import { stageTransitionValues } from "@/lib/deals/stage";

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
      const { workspaceId } = await requireMcpWorkspace(authInfo);
      const conditions = [
        eq(deals.workspaceId, workspaceId),
        ilike(deals.name, `%${query}%`),
      ];
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
        .leftJoin(
          organizations,
          and(
            eq(deals.organizationId, organizations.id),
            eq(organizations.workspaceId, workspaceId),
          ),
        )
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
      const { workspaceId } = await requireMcpWorkspace(authInfo);

      const [deal] = await db
        .select({
          id: deals.id,
          name: deals.name,
          type: deals.type,
          stage: deals.stage,
          valuePence: deals.valuePence,
          currency: deals.currency,
          closeDate: deals.closeDate,
          lostReason: deals.lostReason,
          stageChangedAt: deals.stageChangedAt,
          createdAt: deals.createdAt,
          updatedAt: deals.updatedAt,
          organizationId: deals.organizationId,
          organizationName: organizations.name,
          primaryContactId: deals.primaryContactId,
        })
        .from(deals)
        .leftJoin(
          organizations,
          and(
            eq(deals.organizationId, organizations.id),
            eq(organizations.workspaceId, workspaceId),
          ),
        )
        .where(and(eq(deals.id, id), eq(deals.workspaceId, workspaceId)))
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
                .where(
                  and(
                    eq(contacts.id, deal.primaryContactId),
                    eq(contacts.workspaceId, workspaceId),
                  ),
                )
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
                eq(activities.workspaceId, workspaceId),
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
            .where(
              and(eq(projects.workspaceId, workspaceId), eq(projects.dealId, id)),
            )
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
            .where(and(eq(quotes.workspaceId, workspaceId), eq(quotes.dealId, id)))
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
      const { userId, workspaceId } = await requireMcpWorkspace(authInfo);

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
        input.primaryContactId &&
        !(await entityInWorkspace("contact", input.primaryContactId, workspaceId))
      ) {
        return textResult({
          error: "invalid_reference",
          message: "primaryContactId does not exist in this workspace",
        });
      }

      const [inserted] = await db
        .insert(deals)
        .values({
          workspaceId,
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
        workspaceId,
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
        "Move a deal to a different pipeline stage. Optionally include a `reason` string (e.g. 'they went with a competitor') which is appended to the audit-activity body so the stage change has context on the timeline.",
      inputSchema: {
        id: z.string().uuid(),
        stage: z.enum(STAGE_VALUES),
        reason: z.string().trim().max(2000).optional(),
      },
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ id, stage, reason }, { authInfo }) => {
      const { userId, workspaceId } = await requireMcpWorkspace(authInfo);

      const [before] = await db
        .select({ name: deals.name, stage: deals.stage })
        .from(deals)
        .where(and(eq(deals.id, id), eq(deals.workspaceId, workspaceId)))
        .limit(1);

      if (!before) {
        return textResult({ error: "not_found", id });
      }

      if (before.stage === stage) {
        return textResult({ unchanged: { id, stage } });
      }

      // Shared transition semantics with the web app: stamps stageChangedAt,
      // stamps closeDate on won/lost, records/clears lostReason.
      const [updated] = await db
        .update(deals)
        .set(stageTransitionValues(stage, reason ?? null))
        .where(and(eq(deals.id, id), eq(deals.workspaceId, workspaceId)))
        .returning();

      const base = `Deal "${before.name}" moved from ${before.stage} to ${stage}`;
      await auditMcpWrite({
        workspaceId,
        type: "status_change",
        subjectType: "deal",
        subjectId: id,
        subject: `${before.stage} → ${stage}`,
        body: reason ? `${base}\n\nReason: ${reason}` : base,
        userId,
        metadata: { fromStage: before.stage, toStage: stage, reason },
      });

      return textResult({ updated });
    },
  );

  server.registerTool(
    "update_deal",
    {
      description:
        "Update an existing deal's editable fields. Pass only what you want to change — anything omitted is left alone. Use update_deal_stage for stage moves (it generates a richer audit entry).",
      inputSchema: {
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(200).optional(),
        type: z.enum(TYPE_VALUES).optional(),
        valuePence: z.number().int().min(0).max(1_000_000_000_00).optional(),
        currency: z.string().trim().length(3).optional(),
        closeDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
          .nullable()
          .optional(),
        organizationId: z.string().uuid().nullable().optional(),
        primaryContactId: z.string().uuid().nullable().optional(),
      },
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ id, ...patch }, { authInfo }) => {
      const { userId, workspaceId } = await requireMcpWorkspace(authInfo);

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
        patch.primaryContactId &&
        !(await entityInWorkspace("contact", patch.primaryContactId, workspaceId))
      ) {
        return textResult({
          error: "invalid_reference",
          message: "primaryContactId does not exist in this workspace",
        });
      }

      const updateValues: Record<string, unknown> = { updatedAt: new Date() };
      if (patch.name !== undefined) updateValues.name = patch.name;
      if (patch.type !== undefined) updateValues.type = patch.type;
      if (patch.valuePence !== undefined) updateValues.valuePence = patch.valuePence;
      if (patch.currency !== undefined) updateValues.currency = patch.currency;
      if (patch.closeDate !== undefined) updateValues.closeDate = patch.closeDate;
      if (patch.organizationId !== undefined)
        updateValues.organizationId = patch.organizationId;
      if (patch.primaryContactId !== undefined)
        updateValues.primaryContactId = patch.primaryContactId;

      const [updated] = await db
        .update(deals)
        .set(updateValues)
        .where(and(eq(deals.id, id), eq(deals.workspaceId, workspaceId)))
        .returning();

      if (!updated) return textResult({ error: "not_found", id });

      const changedFields = Object.keys(updateValues).filter(
        (k) => k !== "updatedAt",
      );

      await auditMcpWrite({
        workspaceId,
        type: "note",
        subjectType: "deal",
        subjectId: id,
        subject: `Updated deal ${updated.name}`,
        body:
          changedFields.length > 0
            ? `Changed: ${changedFields.join(", ")}`
            : undefined,
        userId,
      });

      return textResult({ updated });
    },
  );

  server.registerTool(
    "list_deals",
    {
      description:
        "List deals with optional filters. No query string required — use this to scan the whole pipeline (unlike find_deal). Filters: stage, type, createdSinceDays (e.g. 7 = last week). Default limit 50, max 200. Ordered by updated_at desc.",
      inputSchema: {
        stage: z.enum(STAGE_VALUES).optional(),
        type: z.enum(TYPE_VALUES).optional(),
        createdSinceDays: z.number().int().min(1).max(365).optional(),
        limit: z.number().int().min(1).max(200).default(50),
      },
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ stage, type, createdSinceDays, limit }, { authInfo }) => {
      const { workspaceId } = await requireMcpWorkspace(authInfo);
      const filters = [
        eq(deals.workspaceId, workspaceId),
        stage ? eq(deals.stage, stage) : undefined,
        type ? eq(deals.type, type) : undefined,
        createdSinceDays
          ? gte(
              deals.createdAt,
              new Date(Date.now() - createdSinceDays * 24 * 60 * 60 * 1000),
            )
          : undefined,
      ].filter(Boolean) as Parameters<typeof and>[number][];

      const rows = await db
        .select({
          id: deals.id,
          name: deals.name,
          type: deals.type,
          stage: deals.stage,
          valuePence: deals.valuePence,
          currency: deals.currency,
          closeDate: deals.closeDate,
          organizationId: deals.organizationId,
          organizationName: organizations.name,
          primaryContactId: deals.primaryContactId,
          createdAt: deals.createdAt,
          updatedAt: deals.updatedAt,
        })
        .from(deals)
        .leftJoin(
          organizations,
          and(
            eq(deals.organizationId, organizations.id),
            eq(organizations.workspaceId, workspaceId),
          ),
        )
        .where(and(...filters))
        .orderBy(desc(deals.updatedAt))
        .limit(limit);

      return textResult({ count: rows.length, deals: rows });
    },
  );

  server.registerTool(
    "get_pipeline_summary",
    {
      description:
        "Single-call snapshot of the deal pipeline: total open value, weighted forecast (stage-weighted), counts + values per stage, won/lost ratios over the last 90 days. Use this to answer 'how's my pipeline?' style questions in one round-trip instead of fishing through find_deal.",
      inputSchema: {},
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async (_input, { authInfo }) => {
      const { workspaceId } = await requireMcpWorkspace(authInfo);
      const breakdown = await db
        .select({
          stage: deals.stage,
          count: sql<number>`count(*)::int`,
          value: sql<number>`coalesce(sum(${deals.valuePence}), 0)::bigint`,
        })
        .from(deals)
        .where(eq(deals.workspaceId, workspaceId))
        .groupBy(deals.stage);

      const weights: Record<(typeof STAGE_VALUES)[number], number> = {
        lead: 0.1,
        qualified: 0.25,
        proposal: 0.5,
        negotiation: 0.75,
        won: 1,
        lost: 0,
      };

      const byStage: Record<string, { count: number; valuePence: number }> = {};
      let openValue = 0;
      let openCount = 0;
      let weightedPence = 0;
      for (const row of breakdown) {
        const valuePence = Number(row.value);
        byStage[row.stage] = { count: row.count, valuePence };
        if (row.stage !== "won" && row.stage !== "lost") {
          openValue += valuePence;
          openCount += row.count;
        }
        weightedPence += valuePence * (weights[row.stage] ?? 0);
      }

      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const decided = await db
        .select({
          stage: deals.stage,
          count: sql<number>`count(*)::int`,
        })
        .from(deals)
        .where(
          and(
            eq(deals.workspaceId, workspaceId),
            gte(deals.updatedAt, ninetyDaysAgo),
            sql`${deals.stage} in ('won', 'lost')`,
          ),
        )
        .groupBy(deals.stage);

      const won = decided.find((r) => r.stage === "won")?.count ?? 0;
      const lost = decided.find((r) => r.stage === "lost")?.count ?? 0;
      const winRate90d = won + lost === 0 ? null : won / (won + lost);

      return textResult({
        pipeline: {
          openValuePence: openValue,
          openCount,
          weightedForecastPence: Math.round(weightedPence),
          currency: "GBP",
        },
        byStage,
        last90Days: { won, lost, winRate: winRate90d },
      });
    },
  );
}
