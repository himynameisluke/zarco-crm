// Board (Monday-style kanban) — pure core, no db import. There is no shared
// "board columns" table: columns are derived from a workspace's
// project_settings.defaultPhases plus two synthetic columns, "Unphased"
// (projects with no currentPhaseId yet) and "Complete" (projects whose
// status is completed). Moving a card computes a mutation plan; the
// io-shell applies it inside a transaction and writes the status_change
// activity.

export const UNPHASED_COLUMN = "__unphased";
export const COMPLETE_COLUMN = "__complete";

export type BoardColumn = {
  key: string;
  label: string;
};

/** Column order: Unphased holding pen, then the workspace's phase sequence, then Complete. */
export function boardColumns(defaultPhases: string[]): BoardColumn[] {
  return [
    { key: UNPHASED_COLUMN, label: "Unphased" },
    ...defaultPhases.map((name) => ({ key: name, label: name })),
    { key: COMPLETE_COLUMN, label: "Complete" },
  ];
}

export type BoardProjectInput = {
  currentPhaseId: string | null;
  status: string;
};

/** Which column a project's card currently sits in. */
export function columnForProject(
  project: BoardProjectInput,
  phaseIdToName: Map<string, string>,
): string {
  if (project.status === "completed") return COMPLETE_COLUMN;
  if (!project.currentPhaseId) return UNPHASED_COLUMN;
  return phaseIdToName.get(project.currentPhaseId) ?? UNPHASED_COLUMN;
}

export type ProjectPhaseRef = {
  id: string;
  name: string;
  sortOrder: number;
};

export type StatusChangePlan = {
  status: "completed" | "in_progress";
  completedAt: Date | null;
};

export type MoveProjectPlan = {
  /** Existing phase id to set as currentPhaseId. Null for Unphased/Complete, or when the target phase doesn't exist yet (see appendPhase). */
  currentPhaseId: string | null;
  /** The project doesn't have a phase row matching the target column name — create it, then set currentPhaseId to its new id. */
  appendPhase: { name: string; sortOrder: number } | null;
  /** Non-null only when the move crosses the Complete boundary either way. */
  statusChange: StatusChangePlan | null;
};

/**
 * `now` defaults to `new Date()` for real callers but is exposed as a
 * parameter so tests can inject a fixed clock.
 */
export function moveProject(
  project: { status: string },
  targetColumn: string,
  projectPhases: ProjectPhaseRef[],
  now: Date = new Date(),
): MoveProjectPlan {
  const wasComplete = project.status === "completed";

  if (targetColumn === COMPLETE_COLUMN) {
    return {
      currentPhaseId: null,
      appendPhase: null,
      statusChange: wasComplete
        ? null
        : { status: "completed", completedAt: now },
    };
  }

  // Leaving Complete (to Unphased or any real phase) un-completes the
  // project — you don't drag a finished project back onto the board and
  // have it silently stay marked done.
  const leavingComplete: StatusChangePlan | null = wasComplete
    ? { status: "in_progress", completedAt: null }
    : null;

  if (targetColumn === UNPHASED_COLUMN) {
    return {
      currentPhaseId: null,
      appendPhase: null,
      statusChange: leavingComplete,
    };
  }

  const existing = projectPhases.find((p) => p.name === targetColumn);
  return {
    currentPhaseId: existing ? existing.id : null,
    appendPhase: existing
      ? null
      : { name: targetColumn, sortOrder: projectPhases.length },
    statusChange: leavingComplete,
  };
}
