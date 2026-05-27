import { z } from "zod";
import { and, desc, eq, gte, ilike, or, type SQL } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { getPrimaryWorkspaceIdForUser } from "@/lib/workspace/current";
import { getMcpContext, textResult } from "../context";

const LOGGABLE_TYPES = [
  "email",
  "call",
  "meeting",
  "note",
] as const;

const ACTIVITY_TYPES = [
  "email",
  "call",
  "meeting",
  "note",
  "status_change",
  "task_completed",
  "quote_sent",
  "quote_viewed",
  "quote_accepted",
] as const;

const SUBJECT_TYPES = ["contact", "organization", "deal", "project"] as const;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function registerActivityTools(server: McpServer) {
  server.registerTool(
    "search_activities",
    {
      description:
        "Search the activity timeline across all entities. Optional filters by type, subject type, and a recency window. Returns up to 50 results, newest first.",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("Substring match against activity subject or body"),
        type: z
          .enum(ACTIVITY_TYPES)
          .optional()
          .describe("Restrict to one activity type"),
        subjectType: z
          .enum(SUBJECT_TYPES)
          .optional()
          .describe("Restrict to one subject type (e.g. only 'deal' activities)"),
        days: z
          .number()
          .int()
          .min(1)
          .max(365)
          .optional()
          .describe("Only return activities from the last N days (default: no limit)"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ query, type, subjectType, days }, { authInfo }) => {
      getMcpContext(authInfo);

      const conditions: SQL[] = [];
      if (query) {
        const pattern = `%${query}%`;
        conditions.push(
          or(
            ilike(activities.subject, pattern),
            ilike(activities.body, pattern),
          )!,
        );
      }
      if (type) conditions.push(eq(activities.type, type));
      if (subjectType) conditions.push(eq(activities.subjectType, subjectType));
      if (days) conditions.push(gte(activities.occurredAt, daysAgo(days)));

      const rows = await db
        .select({
          id: activities.id,
          type: activities.type,
          source: activities.source,
          subjectType: activities.subjectType,
          subjectId: activities.subjectId,
          subject: activities.subject,
          body: activities.body,
          occurredAt: activities.occurredAt,
        })
        .from(activities)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(activities.occurredAt))
        .limit(50);

      return textResult({ count: rows.length, activities: rows });
    },
  );

  server.registerTool(
    "list_recent_activities",
    {
      description:
        "Lists the most recent activities across the whole CRM. Use this to answer 'what happened recently?' style questions.",
      inputSchema: {
        days: z
          .number()
          .int()
          .min(1)
          .max(90)
          .default(7)
          .describe("Window in days (default 7, max 90)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(50)
          .describe("Maximum number of activities to return (default 50)"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ days, limit }, { authInfo }) => {
      getMcpContext(authInfo);

      const rows = await db
        .select({
          id: activities.id,
          type: activities.type,
          source: activities.source,
          subjectType: activities.subjectType,
          subjectId: activities.subjectId,
          subject: activities.subject,
          occurredAt: activities.occurredAt,
        })
        .from(activities)
        .where(gte(activities.occurredAt, daysAgo(days)))
        .orderBy(desc(activities.occurredAt))
        .limit(limit);

      return textResult({
        window_days: days,
        count: rows.length,
        activities: rows,
      });
    },
  );

  server.registerTool(
    "log_activity",
    {
      description:
        "Log a note / call / meeting / email against any entity (contact, organization, deal, or project). Use this to record things Claude observed in a conversation, or to attach a transcript to a contact. The activity is stamped with source='mcp' so it's distinguishable from manual entries in the timeline.",
      inputSchema: {
        type: z.enum(LOGGABLE_TYPES),
        subjectType: z.enum(SUBJECT_TYPES),
        subjectId: z.string().uuid(),
        subject: z
          .string()
          .trim()
          .min(1)
          .max(500)
          .describe("Short headline — what happened"),
        body: z
          .string()
          .trim()
          .max(50000)
          .optional()
          .describe("Long-form body, e.g. a transcript or meeting notes"),
        occurredAt: z
          .string()
          .datetime({ offset: true })
          .optional()
          .describe("ISO 8601 timestamp; defaults to now"),
      },
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async (input, { authInfo }) => {
      const { userId } = getMcpContext(authInfo);
      const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
      const workspaceId = await getPrimaryWorkspaceIdForUser(userId);
      if (!workspaceId) {
        throw new Error("User has no workspace; cannot log activity");
      }

      const [inserted] = await db
        .insert(activities)
        .values({
          workspaceId,
          type: input.type,
          source: "mcp",
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          subject: input.subject,
          body: input.body ?? null,
          occurredAt,
          createdBy: userId,
        })
        .returning();

      return textResult({ logged: inserted });
    },
  );
}

