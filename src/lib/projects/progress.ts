// Project progress — pure core, no db import. Progress is derived from a
// project's tasks unless a manual override (projects.progressManual) is
// set, in which case the manual value is authoritative (see
// effectiveProgress below and the health.ts advisory doctrine it mirrors).

import type { TaskStatusValue } from "./labels";

export type ProgressTaskInput = {
  status: TaskStatusValue;
};

/**
 * done / (total - cancelled). Cancelled tasks never happened, so they're
 * excluded from both halves of the ratio rather than counted as "not done"
 * — a project that cancels its only three tasks isn't 0% complete, it has
 * no countable work left. Returns null (not 0) when there's nothing to
 * measure, so callers can render "—" instead of a misleading 0%.
 */
export function computeProgress(tasks: ProgressTaskInput[]): number | null {
  const countable = tasks.filter((t) => t.status !== "cancelled");
  if (countable.length === 0) return null;

  const done = countable.filter((t) => t.status === "done").length;
  return Math.round((done / countable.length) * 100);
}

export type ProgressProjectInput = {
  progressManual: number | null;
};

/**
 * The value the UI should actually show: the manual override when the
 * project owner has set one (including 0 — `!= null` is deliberate, a
 * falsy-but-set 0 must not fall through to the computed value), otherwise
 * the tasks-derived figure.
 */
export function effectiveProgress(
  project: ProgressProjectInput,
  tasks: ProgressTaskInput[],
): number | null {
  if (project.progressManual != null) return project.progressManual;
  return computeProgress(tasks);
}
