// Overview stat computation — pure core, no db import. Consumes prefetched
// rows (the io-shell in queries.ts does the actual SELECTs) and produces
// the header metric cards on /projects.

import type { TaskStatusValue } from "./labels";

export type MetricsProjectInput = {
  status: string;
  health: "on_track" | "at_risk" | "off_track";
  /** Effective progress (see progress.ts) — null when there's nothing countable yet. */
  progress: number | null;
  completedAt: Date | null;
};

export type MetricsTaskInput = {
  status: TaskStatusValue;
  dueAt: Date | null;
};

export type MetricsRiskInput = {
  kind: "risk" | "blocker";
  status: "open" | "monitoring" | "resolved";
};

export type ProjectMetrics = {
  active: number;
  atRisk: number;
  blocked: number;
  overdueTasks: number;
  dueThisWeek: number;
  avgProgress: number | null;
  completedThisMonth: number;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeProjectMetrics(
  projects: MetricsProjectInput[],
  tasks: MetricsTaskInput[],
  risks: MetricsRiskInput[],
  now: Date,
): ProjectMetrics {
  const active = projects.filter((p) => p.status === "in_progress").length;

  // "At risk" for the header card buckets both degraded health states —
  // off_track is worse than at_risk, not a separate thing, and there's no
  // dedicated "off track" card.
  const atRisk = projects.filter(
    (p) => p.health === "at_risk" || p.health === "off_track",
  ).length;

  const blocked = risks.filter(
    (r) => r.kind === "blocker" && r.status !== "resolved",
  ).length;

  const sevenDaysAhead = new Date(now.getTime() + 7 * MS_PER_DAY);
  let overdueTasks = 0;
  let dueThisWeek = 0;
  for (const t of tasks) {
    if (t.status === "done" || t.status === "cancelled") continue;
    if (!t.dueAt) continue;
    if (t.dueAt < now) {
      overdueTasks++;
    } else if (t.dueAt <= sevenDaysAhead) {
      dueThisWeek++;
    }
  }

  const progressValues = projects
    .map((p) => p.progress)
    .filter((v): v is number => v != null);
  const avgProgress =
    progressValues.length === 0
      ? null
      : Math.round(
          progressValues.reduce((sum, v) => sum + v, 0) / progressValues.length,
        );

  const completedThisMonth = projects.filter(
    (p) =>
      p.completedAt &&
      p.completedAt.getFullYear() === now.getFullYear() &&
      p.completedAt.getMonth() === now.getMonth(),
  ).length;

  return {
    active,
    atRisk,
    blocked,
    overdueTasks,
    dueThisWeek,
    avgProgress,
    completedThisMonth,
  };
}
