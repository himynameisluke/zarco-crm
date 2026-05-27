import { z } from "zod";
import { and, asc, desc, eq, gte, isNotNull, lt, ne } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { getPrimaryWorkspaceIdForUser } from "@/lib/workspace/current";
import { auditMcpWrite } from "../audit";
import { getMcpContext, textResult } from "../context";

const SUBJECT_TYPES = ["contact", "organization", "deal", "project"] as const;

export function registerTaskTools(server: McpServer) {
  server.registerTool(
    "create_task",
    {
      description:
        "Create a task. Title is required; everything else optional. Optionally link the task to a contact / organization / deal / project via subjectType + subjectId. If you log an audit activity (this happens automatically when the task is linked to an entity), it appears on that entity's timeline.",
      inputSchema: {
        title: z.string().trim().min(1).max(500),
        description: z.string().trim().max(5000).optional(),
        dueAt: z
          .string()
          .datetime({ offset: true })
          .optional()
          .describe("ISO 8601 timestamp"),
        subjectType: z.enum(SUBJECT_TYPES).optional(),
        subjectId: z.string().uuid().optional(),
      },
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async (input, { authInfo }) => {
      const { userId } = getMcpContext(authInfo);

      if ((input.subjectType && !input.subjectId) || (!input.subjectType && input.subjectId)) {
        return textResult({
          error: "invalid_input",
          message: "subjectType and subjectId must both be provided, or neither",
        });
      }

      const workspaceId = await getPrimaryWorkspaceIdForUser(userId);
      if (!workspaceId) {
        throw new Error("User has no workspace; cannot create task");
      }

      const [inserted] = await db
        .insert(tasks)
        .values({
          workspaceId,
          title: input.title,
          description: input.description ?? null,
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
          status: "todo",
          subjectType: input.subjectType ?? null,
          subjectId: input.subjectId ?? null,
          assignedTo: userId,
          createdBy: userId,
        })
        .returning();

      if (input.subjectType && input.subjectId) {
        await auditMcpWrite({
          type: "note",
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          subject: `Task: ${input.title}`,
          body: input.description ?? undefined,
          userId,
        });
      }

      return textResult({ created: inserted });
    },
  );

  server.registerTool(
    "complete_task",
    {
      description:
        "Mark a task as done. Records completedAt timestamp. If the task is linked to an entity, logs a task_completed audit activity on that entity's timeline.",
      inputSchema: {
        id: z.string().uuid(),
      },
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({ id }, { authInfo }) => {
      const { userId } = getMcpContext(authInfo);

      const [updated] = await db
        .update(tasks)
        .set({
          status: "done",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, id))
        .returning();

      if (!updated) {
        return textResult({ error: "not_found", id });
      }

      if (updated.subjectType && updated.subjectId) {
        await auditMcpWrite({
          type: "task_completed",
          subjectType: updated.subjectType,
          subjectId: updated.subjectId,
          subject: `Completed: ${updated.title}`,
          userId,
        });
      }

      return textResult({ updated });
    },
  );

  server.registerTool(
    "list_tasks",
    {
      description:
        "List tasks with optional filters. Use this to answer 'what's on my plate?' style questions. Filters: status (default excludes 'done'), dueWithinDays (e.g. 7 = due in the next week), overdue (true = past due, not done), subjectType + subjectId (tasks linked to one entity). Default limit 50.",
      inputSchema: {
        status: z.enum(["todo", "in_progress", "done"]).optional(),
        dueWithinDays: z.number().int().min(1).max(365).optional(),
        overdue: z.boolean().optional(),
        subjectType: z.enum(SUBJECT_TYPES).optional(),
        subjectId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(200).default(50),
      },
      annotations: { destructiveHint: false, idempotentHint: true },
    },
    async ({
      status,
      dueWithinDays,
      overdue,
      subjectType,
      subjectId,
      limit,
    }) => {
      const now = new Date();
      const filters = [
        // If a specific status is requested, honour it. Otherwise default to
        // "not done" since open work is what callers usually want.
        status ? eq(tasks.status, status) : ne(tasks.status, "done"),
        dueWithinDays
          ? and(
              isNotNull(tasks.dueAt),
              gte(tasks.dueAt, now),
              lt(
                tasks.dueAt,
                new Date(now.getTime() + dueWithinDays * 24 * 60 * 60 * 1000),
              ),
            )
          : undefined,
        overdue
          ? and(isNotNull(tasks.dueAt), lt(tasks.dueAt, now))
          : undefined,
        subjectType ? eq(tasks.subjectType, subjectType) : undefined,
        subjectId ? eq(tasks.subjectId, subjectId) : undefined,
      ].filter(Boolean) as Parameters<typeof and>[number][];

      const rows = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          status: tasks.status,
          dueAt: tasks.dueAt,
          completedAt: tasks.completedAt,
          subjectType: tasks.subjectType,
          subjectId: tasks.subjectId,
          createdAt: tasks.createdAt,
        })
        .from(tasks)
        .where(filters.length ? and(...filters) : undefined)
        // dueAt asc so the most pressing comes first; nulls sort last
        .orderBy(asc(tasks.dueAt), desc(tasks.createdAt))
        .limit(limit);

      return textResult({ count: rows.length, tasks: rows });
    },
  );
}
