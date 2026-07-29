// Status/priority label maps for tasks, extended for project management
// (blocked/cancelled statuses, priority). Pure — no db import — so the web
// app, MCP tools, and vitest can all share one source of truth instead of
// re-declaring the union inline (which is how the pre-project-management
// code drifted: task_status literals were hand-copied in five different
// files).

export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "done",
  "blocked",
  "cancelled",
] as const;

export type TaskStatusValue = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatusValue, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  blocked: "Blocked",
  cancelled: "Cancelled",
};

// Statuses that count as "open"/outstanding work — i.e. everything except
// the two terminal ones. `done` finished successfully; `cancelled` finished
// without doing the work. Both should drop out of "what's still open"
// views (task badges, dashboard due-today/overdue lists) rather than only
// excluding `done`, which would otherwise leave cancelled tasks stuck in
// "open" forever.
export const OPEN_TASK_STATUSES = TASK_STATUSES.filter(
  (s) => s !== "done" && s !== "cancelled",
) as readonly TaskStatusValue[];

export function isOpenTaskStatus(status: TaskStatusValue): boolean {
  return status !== "done" && status !== "cancelled";
}

export const TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export type TaskPriorityValue = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriorityValue, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};
