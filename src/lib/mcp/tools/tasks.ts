import { z } from "zod";
import { eq } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
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

      const [inserted] = await db
        .insert(tasks)
        .values({
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
}
