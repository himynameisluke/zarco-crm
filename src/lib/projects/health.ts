// Health advisories — pure core, no db import. `projects.health` is a
// manual field the project owner sets and stays authoritative; this module
// never overwrites it. It only computes what the data SUGGESTS, so the UI
// can show an advisory chip when the suggestion disagrees with (i.e. is
// worse than) the value someone actually set.

import type { TaskPriorityValue, TaskStatusValue } from "./labels";

export type ProjectHealthValue = "on_track" | "at_risk" | "off_track";

// Ordinal ranking so "worse than" is a simple comparison.
const HEALTH_RANK: Record<ProjectHealthValue, number> = {
  on_track: 0,
  at_risk: 1,
  off_track: 2,
};

export type AdvisorySeverity = "warning" | "critical";

export type HealthAdvisory = {
  severity: AdvisorySeverity;
  label: string;
};

export type HealthMilestoneInput = {
  name: string;
  dueDate: Date | null;
  completedAt: Date | null;
};

export type HealthRiskInput = {
  kind: "risk" | "blocker";
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "monitoring" | "resolved";
};

export type HealthTaskInput = {
  title: string;
  status: TaskStatusValue;
  priority: TaskPriorityValue;
  dueAt: Date | null;
};

export type HealthProjectInput = {
  health: ProjectHealthValue;
  status: string;
  endDate: Date | null;
};

export type HealthAdvisoriesArgs = {
  project: HealthProjectInput;
  milestones: HealthMilestoneInput[];
  risks: HealthRiskInput[];
  tasks: HealthTaskInput[];
  now: Date;
};

export type HealthAdvisoriesResult = {
  advisories: HealthAdvisory[];
  suggestedHealth: ProjectHealthValue;
};

function severityToHealth(s: AdvisorySeverity): ProjectHealthValue {
  return s === "critical" ? "off_track" : "at_risk";
}

export function healthAdvisories({
  project,
  milestones,
  risks,
  tasks,
  now,
}: HealthAdvisoriesArgs): HealthAdvisoriesResult {
  const advisories: HealthAdvisory[] = [];

  for (const m of milestones) {
    if (m.dueDate && !m.completedAt && m.dueDate < now) {
      advisories.push({
        severity: "warning",
        label: `Milestone overdue: ${m.name}`,
      });
    }
  }

  for (const r of risks) {
    if (r.status === "resolved") continue;
    if (r.severity === "critical") {
      advisories.push({
        severity: "critical",
        label: `Critical ${r.kind}: ${r.title}`,
      });
    } else if (r.severity === "high") {
      advisories.push({
        severity: "warning",
        label: `High-severity ${r.kind}: ${r.title}`,
      });
    }
  }

  for (const t of tasks) {
    if (t.status === "done" || t.status === "cancelled") continue;
    if (!t.dueAt || t.dueAt >= now) continue;
    if (t.priority === "urgent") {
      advisories.push({
        severity: "critical",
        label: `Urgent task overdue: ${t.title}`,
      });
    } else if (t.priority === "high") {
      advisories.push({
        severity: "warning",
        label: `High-priority task overdue: ${t.title}`,
      });
    }
  }

  if (
    project.status !== "completed" &&
    project.endDate &&
    project.endDate < now
  ) {
    advisories.push({
      severity: "critical",
      label: "Past target end date",
    });
  }

  const worst = advisories.reduce<ProjectHealthValue>((acc, a) => {
    const candidate = severityToHealth(a.severity);
    return HEALTH_RANK[candidate] > HEALTH_RANK[acc] ? candidate : acc;
  }, "on_track");

  return { advisories, suggestedHealth: worst };
}

/** True when the data suggests things are worse than the manually-set health. */
export function isHealthAdvisoryWorse(
  set: ProjectHealthValue,
  suggested: ProjectHealthValue,
): boolean {
  return HEALTH_RANK[suggested] > HEALTH_RANK[set];
}
