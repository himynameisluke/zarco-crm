import { z } from "zod";

import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/projects/labels";
import type { TaskStatusValue } from "@/lib/projects/labels";

/* The editable columns of a task, minus status (which carries completedAt
   semantics and is handled separately below). dueAt is nullable so a caller can
   CLEAR a due date, not just move it — "take the date off this" is a real ask
   and there was previously no way to express it. */
export const UPDATE_TASK_FIELDS = {
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  dueAt: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .optional()
    .describe("ISO 8601 timestamp, or null to clear the due date"),
  priority: z.enum(TASK_PRIORITIES).optional(),
};

/* The exact input shape update_task registers with the MCP server. Kept away
   from the db imports so the schema itself is unit-testable (deal-update.ts
   sets the precedent). */
export const UPDATE_TASK_INPUT = {
  id: z.string().uuid(),
  status: z.enum(TASK_STATUSES).optional(),
  ...UPDATE_TASK_FIELDS,
};

export type UpdateTaskPatch = {
  [K in keyof typeof UPDATE_TASK_FIELDS]?: z.infer<
    (typeof UPDATE_TASK_FIELDS)[K]
  >;
} & { status?: TaskStatusValue };

export type TaskUpdatePlan =
  | { error: "no_fields"; message: string }
  | {
      values: Record<string, unknown>;
      changedFields: string[];
      /* "completed" when this patch closes the task, "reopened" when it moves a
         done task back into open work, else null. The handler uses it to decide
         whether to log a task_completed activity on the linked entity. */
      transition: "completed" | "reopened" | null;
    };

/* Splits a validated update_task patch into column writes plus the completedAt
   bookkeeping that status changes imply.

   The rule that matters: completedAt must track status, in BOTH directions.
   complete_task only ever sets it, so before this tool a task could be moved
   out of "done" through no path at all — and once update_task exists, a reopened
   task that kept a stale completedAt would read as finished to every downstream
   query (list_tasks' open filter, the overdue sweep). Closing stamps it, moving
   off done clears it.

   An empty patch is an ERROR, matching planDealUpdate: a write tool must never
   report success while writing nothing, because that is exactly how a model ends
   up telling a user "done" about a no-op. */
export function planTaskUpdate(
  patch: UpdateTaskPatch,
  current: { status: TaskStatusValue },
  now: Date,
): TaskUpdatePlan {
  const { status, ...fields } = patch;

  const values: Record<string, unknown> = { updatedAt: now };
  const changedFields: string[] = [];
  for (const key of Object.keys(UPDATE_TASK_FIELDS) as (keyof typeof UPDATE_TASK_FIELDS)[]) {
    if (fields[key] !== undefined) {
      values[key] = key === "dueAt" && fields[key] ? new Date(fields[key] as string) : fields[key];
      changedFields.push(key);
    }
  }

  if (changedFields.length === 0 && status === undefined) {
    return {
      error: "no_fields",
      message:
        "No editable fields were provided, so nothing was updated. Accepted fields: " +
        `status, ${Object.keys(UPDATE_TASK_FIELDS).join(", ")}.`,
    };
  }

  let transition: "completed" | "reopened" | null = null;
  if (status !== undefined) {
    values.status = status;
    changedFields.push("status");
    const wasDone = current.status === "done";
    const isDone = status === "done";
    if (isDone && !wasDone) {
      values.completedAt = now;
      transition = "completed";
    } else if (!isDone && wasDone) {
      values.completedAt = null;
      transition = "reopened";
    }
  }

  return { values, changedFields, transition };
}
