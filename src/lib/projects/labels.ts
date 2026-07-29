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

// ---------------------------------------------------------------------------
// Project management labels — extends the same pure/no-db-import pattern
// above. Canonical lists that live app-side rather than as DB enums
// (projectType) are defined here too, so actions/MCP/UI share one source.
// ---------------------------------------------------------------------------

export const PROJECT_STATUSES = [
  "not_started",
  "in_progress",
  "on_hold",
  "completed",
] as const;

export type ProjectStatusValue = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatusValue, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  on_hold: "On hold",
  completed: "Completed",
};

export const PROJECT_HEALTHS = ["on_track", "at_risk", "off_track"] as const;

export type ProjectHealthLabelValue = (typeof PROJECT_HEALTHS)[number];

export const PROJECT_HEALTH_LABELS: Record<ProjectHealthLabelValue, string> = {
  on_track: "On track",
  at_risk: "At risk",
  off_track: "Off track",
};

// Canonical project types — app-side (not a DB enum) so the list stays
// editable without a migration. projects.projectType is a nullable text
// column; any of these are valid, null means unset.
export const PROJECT_TYPES = [
  "console_implementation",
  "consultancy",
  "automation",
  "bespoke_build",
  "agent_deployment",
  "integration",
  "other",
] as const;

export type ProjectTypeValue = (typeof PROJECT_TYPES)[number];

export const PROJECT_TYPE_LABELS: Record<ProjectTypeValue, string> = {
  console_implementation: "Console implementation",
  consultancy: "Consultancy",
  automation: "Automation",
  bespoke_build: "Bespoke build",
  agent_deployment: "Agent deployment",
  integration: "Integration",
  other: "Other",
};

export const PROJECT_RISK_KINDS = ["risk", "blocker"] as const;
export type ProjectRiskKindValue = (typeof PROJECT_RISK_KINDS)[number];
export const PROJECT_RISK_KIND_LABELS: Record<ProjectRiskKindValue, string> = {
  risk: "Risk",
  blocker: "Blocker",
};

export const PROJECT_RISK_SEVERITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;
export type ProjectRiskSeverityValue = (typeof PROJECT_RISK_SEVERITIES)[number];
export const PROJECT_RISK_SEVERITY_LABELS: Record<ProjectRiskSeverityValue, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

// Blockers don't carry a likelihood (they're already happening) — the DB
// column is nullable for exactly that reason.
export const PROJECT_RISK_LIKELIHOODS = ["low", "medium", "high"] as const;
export type ProjectRiskLikelihoodValue = (typeof PROJECT_RISK_LIKELIHOODS)[number];
export const PROJECT_RISK_LIKELIHOOD_LABELS: Record<ProjectRiskLikelihoodValue, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const PROJECT_RISK_STATUSES = ["open", "monitoring", "resolved"] as const;
export type ProjectRiskStatusValue = (typeof PROJECT_RISK_STATUSES)[number];
export const PROJECT_RISK_STATUS_LABELS: Record<ProjectRiskStatusValue, string> = {
  open: "Open",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

export const PROJECT_TEMPLATE_ITEM_KINDS = ["phase", "milestone", "task"] as const;
export type ProjectTemplateItemKindValue = (typeof PROJECT_TEMPLATE_ITEM_KINDS)[number];

// Fallback default phase sequence — mirrors project_settings.defaultPhases'
// DB default (schema.ts) so a workspace with no settings row yet (or one
// created before this feature) still gets a sensible board. Kept as a
// literal duplicate rather than importing schema.ts here to preserve this
// module's no-db-import purity.
export const DEFAULT_PROJECT_PHASES = [
  "Discovery",
  "Solution Design",
  "Build",
  "Integration",
  "Testing",
  "Training",
  "Go-Live",
  "Hypercare",
] as const;
