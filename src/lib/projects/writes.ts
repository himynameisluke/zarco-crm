import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  activities,
  projectLinks,
  projectMilestones,
  projectPhases,
  projectRisks,
  projectSettings,
  projectTemplateItems,
  projectTemplates,
  projects,
  tasks,
} from "@/lib/db/schema";
import { expandTemplate, type TemplateItemInput } from "./template";
import { moveProject, columnForProject, COMPLETE_COLUMN, UNPHASED_COLUMN } from "./board";
import { SEED_TEMPLATES } from "./templates-seed";
import type { ProjectHealthLabelValue, ProjectStatusValue } from "./labels";

// =============================================================================
// Shared write logic — consumed by BOTH the web server actions
// (src/app/(app)/projects/actions*.ts) and the MCP tools
// (src/lib/mcp/tools/projects.ts) so a mutation means the same thing no
// matter which surface made it. Callers are responsible for auth,
// requireCurrentWorkspace/requireMcpWorkspace, zod validation, and
// entityInWorkspace checks on every user-supplied FK — everything here
// assumes its workspaceId-scoped ids are already trustworthy.
//
// `source` threads through to every activity write so the UI can tell a
// manual edit from an MCP-originated one (zap icon / magenta tint), exactly
// like auditMcpWrite does for the rest of the CRM.
// =============================================================================

export type WriteSource = "manual" | "mcp" | "system";

function activitySubjectId(projectId: string) {
  return projectId;
}

// -----------------------------------------------------------------------
// Project create (wizard) — one transaction: project + template expansion
// (phases/milestones/tasks) + "created" activity.
// -----------------------------------------------------------------------

export type CreateProjectInput = {
  workspaceId: string;
  userId: string;
  name: string;
  organizationId: string | null;
  dealId: string | null;
  ownerId: string | null;
  status: ProjectStatusValue;
  health: ProjectHealthLabelValue;
  projectType: string | null;
  description: string | null;
  successCriteria: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  /** When set, expandTemplate() seeds phases/milestones/tasks. Must belong to workspaceId — caller validates via entityInWorkspace. */
  templateId: string | null;
  source?: WriteSource;
};

export async function createProjectCore(
  input: CreateProjectInput,
): Promise<{ id: string }> {
  const source = input.source ?? "manual";

  return db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        workspaceId: input.workspaceId,
        name: input.name,
        organizationId: input.organizationId,
        dealId: input.dealId,
        ownerId: input.ownerId,
        status: input.status,
        health: input.health,
        projectType: input.projectType,
        description: input.description,
        successCriteria: input.successCriteria,
        startDate: input.startDate,
        endDate: input.endDate,
        notes: input.notes,
        templateId: input.templateId,
      })
      .returning({ id: projects.id });

    let templateName: string | null = null;

    if (input.templateId) {
      const [template] = await tx
        .select({ id: projectTemplates.id, name: projectTemplates.name })
        .from(projectTemplates)
        .where(
          and(
            eq(projectTemplates.id, input.templateId),
            eq(projectTemplates.workspaceId, input.workspaceId),
          ),
        )
        .limit(1);

      if (template) {
        templateName = template.name;

        const items = await tx
          .select({
            kind: projectTemplateItems.kind,
            name: projectTemplateItems.name,
            description: projectTemplateItems.description,
            phaseName: projectTemplateItems.phaseName,
            offsetDays: projectTemplateItems.offsetDays,
            sortOrder: projectTemplateItems.sortOrder,
          })
          .from(projectTemplateItems)
          .where(eq(projectTemplateItems.templateId, template.id));

        const expanded = expandTemplate(template, items as TemplateItemInput[], {
          startDate: input.startDate ? new Date(input.startDate) : new Date(),
        });

        const phaseNameToId = new Map<string, string>();
        if (expanded.phases.length > 0) {
          const insertedPhases = await tx
            .insert(projectPhases)
            .values(
              expanded.phases.map((p) => ({
                workspaceId: input.workspaceId,
                projectId: project.id,
                name: p.name,
                sortOrder: p.sortOrder,
              })),
            )
            .returning({ id: projectPhases.id, name: projectPhases.name });
          for (const p of insertedPhases) phaseNameToId.set(p.name, p.id);
        }

        if (expanded.milestones.length > 0) {
          await tx.insert(projectMilestones).values(
            expanded.milestones.map((m) => ({
              workspaceId: input.workspaceId,
              projectId: project.id,
              phaseId: m.phaseName ? phaseNameToId.get(m.phaseName) ?? null : null,
              name: m.name,
              description: m.description,
              dueDate: m.dueDate ? m.dueDate.toISOString().slice(0, 10) : null,
              sortOrder: m.sortOrder,
            })),
          );
        }

        if (expanded.tasks.length > 0) {
          await tx.insert(tasks).values(
            expanded.tasks.map((t) => ({
              workspaceId: input.workspaceId,
              title: t.title,
              description: t.description,
              subjectType: "project" as const,
              subjectId: project.id,
              projectPhaseId: t.phaseName ? phaseNameToId.get(t.phaseName) ?? null : null,
              dueAt: t.dueAt,
              sortOrder: t.sortOrder,
              createdBy: input.userId,
            })),
          );
        }

        // Land the project on the first template phase rather than leaving
        // it Unphased when a template just seeded a whole sequence for it.
        const firstPhaseName = expanded.phases[0]?.name;
        const firstPhaseId = firstPhaseName ? phaseNameToId.get(firstPhaseName) : undefined;
        if (firstPhaseId) {
          await tx
            .update(projects)
            .set({ currentPhaseId: firstPhaseId })
            .where(eq(projects.id, project.id));
        }
      }
    }

    await tx.insert(activities).values({
      workspaceId: input.workspaceId,
      type: "note",
      source,
      subjectType: "project",
      subjectId: project.id,
      subject: "Project created",
      body: templateName ? `Created from template: ${templateName}` : undefined,
      createdBy: input.userId,
    });

    return { id: project.id };
  });
}

// -----------------------------------------------------------------------
// Project update — status/health/phase/dates/owner/description/
// successCriteria/progressManual (+ organizationId/projectType/dealId).
// Only keys present on `patch` are touched (PATCH semantics, same as
// update_deal). Activities: status change, phase change (status_change with
// metadata {kind:'phase', from, to}), owner change — health/dates/progress
// overrides/description are silent per spec.
// -----------------------------------------------------------------------

export type UpdateProjectPatch = {
  name?: string;
  status?: ProjectStatusValue;
  health?: ProjectHealthLabelValue;
  currentPhaseId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  ownerId?: string | null;
  description?: string | null;
  successCriteria?: string | null;
  progressManual?: number | null;
  organizationId?: string | null;
  projectType?: string | null;
  dealId?: string | null;
  templateId?: string | null;
  notes?: string | null;
};

export type UpdateProjectResult =
  | { updated: typeof projects.$inferSelect }
  | { error: "not_found" };

export async function updateProjectCore(args: {
  workspaceId: string;
  userId: string;
  id: string;
  patch: UpdateProjectPatch;
  source?: WriteSource;
}): Promise<UpdateProjectResult> {
  const { workspaceId, userId, id, patch } = args;
  const source = args.source ?? "manual";

  const [before] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
    .limit(1);
  if (!before) return { error: "not_found" };

  const setValues: Record<string, unknown> = { updatedAt: new Date() };
  const plainKeys = [
    "name",
    "health",
    "currentPhaseId",
    "startDate",
    "endDate",
    "ownerId",
    "description",
    "successCriteria",
    "progressManual",
    "organizationId",
    "projectType",
    "dealId",
    "templateId",
    "notes",
  ] as const;
  for (const key of plainKeys) {
    if (patch[key] !== undefined) setValues[key] = patch[key];
  }

  const statusChanged = patch.status !== undefined && patch.status !== before.status;
  if (statusChanged) {
    setValues.status = patch.status;
    if (patch.status === "completed") {
      setValues.completedAt = new Date();
    } else if (before.status === "completed") {
      setValues.completedAt = null;
    }
  }

  const phaseChanged =
    patch.currentPhaseId !== undefined && patch.currentPhaseId !== before.currentPhaseId;
  const ownerChanged = patch.ownerId !== undefined && patch.ownerId !== before.ownerId;

  const [updated] = await db
    .update(projects)
    .set(setValues)
    .where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
    .returning();

  if (statusChanged) {
    await db.insert(activities).values({
      workspaceId,
      type: "status_change",
      source,
      subjectType: "project",
      subjectId: activitySubjectId(id),
      subject: `${before.status} → ${patch.status}`,
      body: `Project "${before.name}" moved from ${before.status} to ${patch.status}`,
      metadata: { kind: "status", from: before.status, to: patch.status },
      createdBy: userId,
    });
  }

  if (phaseChanged) {
    const phaseIds = [before.currentPhaseId, patch.currentPhaseId ?? null].filter(
      (v): v is string => Boolean(v),
    );
    const phaseRows = phaseIds.length
      ? await db
          .select({ id: projectPhases.id, name: projectPhases.name })
          .from(projectPhases)
          .where(inArray(projectPhases.id, phaseIds))
      : [];
    const nameOf = (pid: string | null | undefined) =>
      pid ? phaseRows.find((p) => p.id === pid)?.name ?? "Unknown phase" : "Unphased";
    const fromName = nameOf(before.currentPhaseId);
    const toName = nameOf(patch.currentPhaseId);
    await db.insert(activities).values({
      workspaceId,
      type: "status_change",
      source,
      subjectType: "project",
      subjectId: activitySubjectId(id),
      subject: `${fromName} → ${toName}`,
      body: `Project "${before.name}" phase changed from ${fromName} to ${toName}`,
      metadata: { kind: "phase", from: before.currentPhaseId, to: patch.currentPhaseId },
      createdBy: userId,
    });
  }

  if (ownerChanged) {
    await db.insert(activities).values({
      workspaceId,
      type: "note",
      source,
      subjectType: "project",
      subjectId: activitySubjectId(id),
      subject: "Owner changed",
      metadata: { kind: "owner", from: before.ownerId, to: patch.ownerId },
      createdBy: userId,
    });
  }

  return { updated };
}

// -----------------------------------------------------------------------
// Board move — applies board.ts's moveProject() plan inside a transaction:
// creates the target phase row if the project doesn't have one matching the
// column name yet, sets currentPhaseId, applies any status transition
// crossing the Complete boundary, writes one status_change activity.
// -----------------------------------------------------------------------

export type MoveProjectResult =
  | { updated: typeof projects.$inferSelect }
  | { error: "not_found" };

export async function moveProjectOnBoardCore(args: {
  workspaceId: string;
  userId: string;
  projectId: string;
  targetColumn: string;
  source?: WriteSource;
}): Promise<MoveProjectResult> {
  const { workspaceId, userId, projectId, targetColumn } = args;
  const source = args.source ?? "manual";

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
    .limit(1);
  if (!project) return { error: "not_found" };

  const phaseRows = await db
    .select({ id: projectPhases.id, name: projectPhases.name, sortOrder: projectPhases.sortOrder })
    .from(projectPhases)
    .where(and(eq(projectPhases.workspaceId, workspaceId), eq(projectPhases.projectId, projectId)))
    .orderBy(asc(projectPhases.sortOrder));

  const plan = moveProject(project, targetColumn, phaseRows);

  return db.transaction(async (tx) => {
    let currentPhaseId = plan.currentPhaseId;
    let newPhaseName: string | null = null;

    if (plan.appendPhase) {
      const [inserted] = await tx
        .insert(projectPhases)
        .values({
          workspaceId,
          projectId,
          name: plan.appendPhase.name,
          sortOrder: plan.appendPhase.sortOrder,
        })
        .returning({ id: projectPhases.id, name: projectPhases.name });
      currentPhaseId = inserted.id;
      newPhaseName = inserted.name;
    }

    const setValues: Record<string, unknown> = { currentPhaseId, updatedAt: new Date() };
    if (plan.statusChange) {
      setValues.status = plan.statusChange.status;
      setValues.completedAt = plan.statusChange.completedAt;
    }

    const [updated] = await tx
      .update(projects)
      .set(setValues)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .returning();

    const toName =
      newPhaseName ??
      phaseRows.find((p) => p.id === currentPhaseId)?.name ??
      (targetColumn === "__complete" ? "Complete" : targetColumn === "__unphased" ? "Unphased" : targetColumn);

    // Derive the pre-move column the same way the board itself does
    // (status === 'completed' wins over whatever currentPhaseId happens to
    // still hold) — a project marked complete off-board keeps its old
    // currentPhaseId, so reading that raw id here would mislabel an
    // un-complete move as "came from <stale phase>" instead of "Complete".
    const phaseIdToName = new Map(phaseRows.map((p) => [p.id, p.name]));
    const fromColumn = columnForProject(project, phaseIdToName);
    const fromName =
      fromColumn === COMPLETE_COLUMN ? "Complete" : fromColumn === UNPHASED_COLUMN ? "Unphased" : fromColumn;

    await tx.insert(activities).values({
      workspaceId,
      type: "status_change",
      source,
      subjectType: "project",
      subjectId: activitySubjectId(projectId),
      subject: `${fromName} → ${toName}`,
      body: `Project "${project.name}" moved on the board from ${fromName} to ${toName}`,
      metadata: { kind: "phase", from: fromColumn, to: currentPhaseId },
      createdBy: userId,
    });

    return { updated };
  });
}

// -----------------------------------------------------------------------
// Tasks (project-scoped) — create/update/status-change/complete/bulk/reorder.
// -----------------------------------------------------------------------

export type CreateProjectTaskInput = {
  workspaceId: string;
  userId: string;
  projectId: string;
  title: string;
  description: string | null;
  dueAt: Date | null;
  priority: "low" | "normal" | "high" | "urgent";
  assignedTo: string | null;
  projectPhaseId: string | null;
  milestoneId: string | null;
  source?: WriteSource;
};

export async function createProjectTaskCore(
  input: CreateProjectTaskInput,
): Promise<{ id: string }> {
  const source = input.source ?? "manual";

  const [inserted] = await db
    .insert(tasks)
    .values({
      workspaceId: input.workspaceId,
      title: input.title,
      description: input.description,
      status: "todo",
      priority: input.priority,
      subjectType: "project",
      subjectId: input.projectId,
      dueAt: input.dueAt,
      assignedTo: input.assignedTo,
      projectPhaseId: input.projectPhaseId,
      milestoneId: input.milestoneId,
      createdBy: input.userId,
    })
    .returning({ id: tasks.id });

  await db.insert(activities).values({
    workspaceId: input.workspaceId,
    type: "note",
    source,
    subjectType: "project",
    subjectId: activitySubjectId(input.projectId),
    subject: `Task created: ${input.title}`,
    createdBy: input.userId,
  });

  return { id: inserted.id };
}

export type UpdateProjectTaskPatch = {
  title?: string;
  description?: string | null;
  dueAt?: Date | null;
  priority?: "low" | "normal" | "high" | "urgent";
  assignedTo?: string | null;
  projectPhaseId?: string | null;
  milestoneId?: string | null;
  sortOrder?: number;
};

export async function updateProjectTaskCore(args: {
  workspaceId: string;
  id: string;
  patch: UpdateProjectTaskPatch;
}): Promise<{ updated: typeof tasks.$inferSelect } | { error: "not_found" }> {
  const setValues: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of [
    "title",
    "description",
    "dueAt",
    "priority",
    "assignedTo",
    "projectPhaseId",
    "milestoneId",
    "sortOrder",
  ] as const) {
    if (args.patch[key] !== undefined) setValues[key] = args.patch[key];
  }

  const [updated] = await db
    .update(tasks)
    .set(setValues)
    .where(and(eq(tasks.id, args.id), eq(tasks.workspaceId, args.workspaceId)))
    .returning();
  if (!updated) return { error: "not_found" };
  return { updated };
}

const TASK_STATUS_VALUES = ["todo", "in_progress", "done", "blocked", "cancelled"] as const;
type ProjectTaskStatus = (typeof TASK_STATUS_VALUES)[number];

/**
 * Sets a task's status. Writes a `task_completed` activity only when
 * transitioning INTO 'done' (matches the pre-existing MCP complete_task
 * behaviour) — other status moves (todo/in_progress/blocked/cancelled) are
 * silent per spec, which only calls out "task created/completed" as
 * activity-worthy.
 */
export async function setProjectTaskStatusCore(args: {
  workspaceId: string;
  userId: string;
  id: string;
  status: ProjectTaskStatus;
  source?: WriteSource;
}): Promise<{ updated: typeof tasks.$inferSelect } | { error: "not_found" }> {
  const source = args.source ?? "manual";

  const setValues: Record<string, unknown> = { status: args.status, updatedAt: new Date() };
  if (args.status === "done") {
    setValues.completedAt = new Date();
  } else {
    setValues.completedAt = null;
  }

  const [updated] = await db
    .update(tasks)
    .set(setValues)
    .where(and(eq(tasks.id, args.id), eq(tasks.workspaceId, args.workspaceId)))
    .returning();
  if (!updated) return { error: "not_found" };

  if (args.status === "done" && updated.subjectType === "project" && updated.subjectId) {
    await db.insert(activities).values({
      workspaceId: args.workspaceId,
      type: "task_completed",
      source,
      subjectType: "project",
      subjectId: updated.subjectId,
      subject: `Completed: ${updated.title}`,
      createdBy: args.userId,
    });
  }

  return { updated };
}

export async function completeProjectTaskCore(args: {
  workspaceId: string;
  userId: string;
  id: string;
  source?: WriteSource;
}) {
  return setProjectTaskStatusCore({ ...args, status: "done" });
}

export async function bulkUpdateProjectTasksCore(args: {
  workspaceId: string;
  ids: string[];
  status?: ProjectTaskStatus;
  assignedTo?: string | null;
}): Promise<{ updatedCount: number }> {
  if (args.ids.length === 0) return { updatedCount: 0 };

  const setValues: Record<string, unknown> = { updatedAt: new Date() };
  if (args.status !== undefined) {
    setValues.status = args.status;
    setValues.completedAt = args.status === "done" ? new Date() : null;
  }
  if (args.assignedTo !== undefined) setValues.assignedTo = args.assignedTo;

  const updated = await db
    .update(tasks)
    .set(setValues)
    .where(and(eq(tasks.workspaceId, args.workspaceId), inArray(tasks.id, args.ids)))
    .returning({ id: tasks.id });

  return { updatedCount: updated.length };
}

/** Applies the given ids' order as their new sortOrder (0-indexed). */
export async function reorderProjectTasksCore(args: {
  workspaceId: string;
  orderedIds: string[];
}): Promise<void> {
  await Promise.all(
    args.orderedIds.map((id, index) =>
      db
        .update(tasks)
        .set({ sortOrder: index, updatedAt: new Date() })
        .where(and(eq(tasks.id, id), eq(tasks.workspaceId, args.workspaceId))),
    ),
  );
}

export async function deleteProjectTaskCore(args: {
  workspaceId: string;
  id: string;
}): Promise<void> {
  await db.delete(tasks).where(and(eq(tasks.id, args.id), eq(tasks.workspaceId, args.workspaceId)));
}

// -----------------------------------------------------------------------
// Milestones — create/update/complete/delete. Only "completed" is
// activity-worthy per spec (creation is silent).
// -----------------------------------------------------------------------

export type CreateMilestoneInput = {
  workspaceId: string;
  projectId: string;
  phaseId: string | null;
  name: string;
  description: string | null;
  dueDate: string | null;
  ownerId: string | null;
  sortOrder: number;
};

export async function createMilestoneCore(
  input: CreateMilestoneInput,
): Promise<{ id: string }> {
  const [inserted] = await db
    .insert(projectMilestones)
    .values({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      phaseId: input.phaseId,
      name: input.name,
      description: input.description,
      dueDate: input.dueDate,
      ownerId: input.ownerId,
      sortOrder: input.sortOrder,
    })
    .returning({ id: projectMilestones.id });
  return { id: inserted.id };
}

export type UpdateMilestonePatch = {
  name?: string;
  description?: string | null;
  dueDate?: string | null;
  phaseId?: string | null;
  ownerId?: string | null;
  sortOrder?: number;
};

export async function updateMilestoneCore(args: {
  workspaceId: string;
  id: string;
  patch: UpdateMilestonePatch;
}): Promise<{ updated: typeof projectMilestones.$inferSelect } | { error: "not_found" }> {
  const setValues: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of ["name", "description", "dueDate", "phaseId", "ownerId", "sortOrder"] as const) {
    if (args.patch[key] !== undefined) setValues[key] = args.patch[key];
  }
  const [updated] = await db
    .update(projectMilestones)
    .set(setValues)
    .where(and(eq(projectMilestones.id, args.id), eq(projectMilestones.workspaceId, args.workspaceId)))
    .returning();
  if (!updated) return { error: "not_found" };
  return { updated };
}

export async function completeMilestoneCore(args: {
  workspaceId: string;
  userId: string;
  id: string;
  source?: WriteSource;
}): Promise<{ updated: typeof projectMilestones.$inferSelect } | { error: "not_found" }> {
  const source = args.source ?? "manual";
  const [updated] = await db
    .update(projectMilestones)
    .set({ completedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(projectMilestones.id, args.id), eq(projectMilestones.workspaceId, args.workspaceId)))
    .returning();
  if (!updated) return { error: "not_found" };

  await db.insert(activities).values({
    workspaceId: args.workspaceId,
    type: "milestone_completed",
    source,
    subjectType: "project",
    subjectId: updated.projectId,
    subject: `Milestone completed: ${updated.name}`,
    createdBy: args.userId,
  });

  return { updated };
}

export async function deleteMilestoneCore(args: {
  workspaceId: string;
  id: string;
}): Promise<void> {
  await db
    .delete(projectMilestones)
    .where(and(eq(projectMilestones.id, args.id), eq(projectMilestones.workspaceId, args.workspaceId)));
}

// -----------------------------------------------------------------------
// Risks & blockers — raise/edit/resolve/delete. raise + resolve write
// activities (risk_raised / risk_resolved); plain edits are silent.
// -----------------------------------------------------------------------

export type RaiseRiskInput = {
  workspaceId: string;
  userId: string;
  projectId: string;
  kind: "risk" | "blocker";
  title: string;
  description: string | null;
  severity: "low" | "medium" | "high" | "critical";
  likelihood: "low" | "medium" | "high" | null;
  ownerId: string | null;
  mitigation: string | null;
  source?: WriteSource;
};

export async function raiseRiskCore(input: RaiseRiskInput): Promise<{ id: string }> {
  const source = input.source ?? "manual";

  const [inserted] = await db
    .insert(projectRisks)
    .values({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      kind: input.kind,
      title: input.title,
      description: input.description,
      severity: input.severity,
      likelihood: input.kind === "blocker" ? null : input.likelihood,
      ownerId: input.ownerId,
      mitigation: input.mitigation,
      status: "open",
    })
    .returning({ id: projectRisks.id });

  await db.insert(activities).values({
    workspaceId: input.workspaceId,
    type: "risk_raised",
    source,
    subjectType: "project",
    subjectId: input.projectId,
    subject: `${input.kind === "blocker" ? "Blocker" : "Risk"} raised: ${input.title}`,
    body: `Severity: ${input.severity}`,
    createdBy: input.userId,
  });

  return { id: inserted.id };
}

export type UpdateRiskPatch = {
  title?: string;
  description?: string | null;
  severity?: "low" | "medium" | "high" | "critical";
  likelihood?: "low" | "medium" | "high" | null;
  ownerId?: string | null;
  mitigation?: string | null;
  status?: "open" | "monitoring" | "resolved";
};

export async function updateRiskCore(args: {
  workspaceId: string;
  id: string;
  patch: UpdateRiskPatch;
}): Promise<{ updated: typeof projectRisks.$inferSelect } | { error: "not_found" }> {
  const setValues: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of [
    "title",
    "description",
    "severity",
    "likelihood",
    "ownerId",
    "mitigation",
    "status",
  ] as const) {
    if (args.patch[key] !== undefined) setValues[key] = args.patch[key];
  }
  const [updated] = await db
    .update(projectRisks)
    .set(setValues)
    .where(and(eq(projectRisks.id, args.id), eq(projectRisks.workspaceId, args.workspaceId)))
    .returning();
  if (!updated) return { error: "not_found" };
  return { updated };
}

export async function resolveRiskCore(args: {
  workspaceId: string;
  userId: string;
  id: string;
  resolution: string | null;
  source?: WriteSource;
}): Promise<{ updated: typeof projectRisks.$inferSelect } | { error: "not_found" }> {
  const source = args.source ?? "manual";
  const [updated] = await db
    .update(projectRisks)
    .set({
      status: "resolved",
      resolution: args.resolution,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(projectRisks.id, args.id), eq(projectRisks.workspaceId, args.workspaceId)))
    .returning();
  if (!updated) return { error: "not_found" };

  await db.insert(activities).values({
    workspaceId: args.workspaceId,
    type: "risk_resolved",
    source,
    subjectType: "project",
    subjectId: updated.projectId,
    subject: `${updated.kind === "blocker" ? "Blocker" : "Risk"} resolved: ${updated.title}`,
    body: args.resolution ?? undefined,
    createdBy: args.userId,
  });

  return { updated };
}

export async function deleteRiskCore(args: { workspaceId: string; id: string }): Promise<void> {
  await db
    .delete(projectRisks)
    .where(and(eq(projectRisks.id, args.id), eq(projectRisks.workspaceId, args.workspaceId)));
}

// -----------------------------------------------------------------------
// Links — add/remove. "Link added" is activity-worthy per spec; removal
// isn't called out, kept silent.
// -----------------------------------------------------------------------

export async function addLinkCore(input: {
  workspaceId: string;
  userId: string;
  projectId: string;
  title: string;
  url: string;
  kind: string | null;
  source?: WriteSource;
}): Promise<{ id: string }> {
  const source = input.source ?? "manual";

  const [inserted] = await db
    .insert(projectLinks)
    .values({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      title: input.title,
      url: input.url,
      kind: input.kind,
      createdBy: input.userId,
    })
    .returning({ id: projectLinks.id });

  await db.insert(activities).values({
    workspaceId: input.workspaceId,
    type: "note",
    source,
    subjectType: "project",
    subjectId: input.projectId,
    subject: `Link added: ${input.title}`,
    body: input.url,
    createdBy: input.userId,
  });

  return { id: inserted.id };
}

export async function removeLinkCore(args: { workspaceId: string; id: string }): Promise<void> {
  await db
    .delete(projectLinks)
    .where(and(eq(projectLinks.id, args.id), eq(projectLinks.workspaceId, args.workspaceId)));
}

// -----------------------------------------------------------------------
// Templates + items — workspace-scoped CRUD, plus the lazy default-template
// seed. Items are replaced wholesale on save (same pattern as quote line
// items) rather than granular item-level CRUD.
// -----------------------------------------------------------------------

export async function createTemplateCore(input: {
  workspaceId: string;
  name: string;
  description: string | null;
  projectType: string | null;
}): Promise<{ id: string }> {
  const [inserted] = await db
    .insert(projectTemplates)
    .values({
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description,
      projectType: input.projectType,
    })
    .returning({ id: projectTemplates.id });
  return { id: inserted.id };
}

export async function updateTemplateCore(args: {
  workspaceId: string;
  id: string;
  patch: { name?: string; description?: string | null; projectType?: string | null };
}): Promise<{ updated: typeof projectTemplates.$inferSelect } | { error: "not_found" }> {
  const setValues: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of ["name", "description", "projectType"] as const) {
    if (args.patch[key] !== undefined) setValues[key] = args.patch[key];
  }
  const [updated] = await db
    .update(projectTemplates)
    .set(setValues)
    .where(and(eq(projectTemplates.id, args.id), eq(projectTemplates.workspaceId, args.workspaceId)))
    .returning();
  if (!updated) return { error: "not_found" };
  return { updated };
}

export async function deleteTemplateCore(args: { workspaceId: string; id: string }): Promise<void> {
  // project_template_items cascade on template delete via the FK.
  await db
    .delete(projectTemplates)
    .where(and(eq(projectTemplates.id, args.id), eq(projectTemplates.workspaceId, args.workspaceId)));
}

export type TemplateItemUpsert = {
  kind: "phase" | "milestone" | "task";
  name: string;
  description: string | null;
  phaseName: string | null;
  offsetDays: number | null;
  sortOrder: number;
};

/** Replaces a template's whole item list — the items editor saves the full set at once. */
export async function replaceTemplateItemsCore(args: {
  workspaceId: string;
  templateId: string;
  items: TemplateItemUpsert[];
}): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(projectTemplateItems)
      .where(
        and(
          eq(projectTemplateItems.templateId, args.templateId),
          eq(projectTemplateItems.workspaceId, args.workspaceId),
        ),
      );
    if (args.items.length > 0) {
      await tx.insert(projectTemplateItems).values(
        args.items.map((item) => ({
          workspaceId: args.workspaceId,
          templateId: args.templateId,
          kind: item.kind,
          name: item.name,
          description: item.description,
          phaseName: item.phaseName,
          offsetDays: item.offsetDays,
          sortOrder: item.sortOrder,
        })),
      );
    }
  });
}

/**
 * Lazily seeds the two built-in templates (templates-seed.ts) into a
 * workspace the first time it has none — NOT a prod data migration, every
 * workspace gets its own editable copy. No-op (returns 0) if the workspace
 * already has any templates.
 */
export async function seedDefaultTemplatesCore(
  workspaceId: string,
): Promise<{ createdCount: number }> {
  const [existing] = await db
    .select({ id: projectTemplates.id })
    .from(projectTemplates)
    .where(eq(projectTemplates.workspaceId, workspaceId))
    .limit(1);
  if (existing) return { createdCount: 0 };

  await db.transaction(async (tx) => {
    for (const seed of SEED_TEMPLATES) {
      const [template] = await tx
        .insert(projectTemplates)
        .values({
          workspaceId,
          name: seed.name,
          description: seed.description,
          projectType: seed.projectType,
        })
        .returning({ id: projectTemplates.id });

      await tx.insert(projectTemplateItems).values(
        seed.items.map((item) => ({
          workspaceId,
          templateId: template.id,
          kind: item.kind,
          name: item.name,
          description: item.description,
          phaseName: item.phaseName,
          offsetDays: item.offsetDays,
          sortOrder: item.sortOrder,
        })),
      );
    }
  });

  return { createdCount: SEED_TEMPLATES.length };
}

// -----------------------------------------------------------------------
// project_settings — one row per workspace, get-or-default (read) lives in
// queries.ts; this is the write half.
// -----------------------------------------------------------------------

export async function updateProjectSettingsCore(args: {
  workspaceId: string;
  defaultPhases: string[];
}): Promise<{ defaultPhases: string[] }> {
  await db
    .insert(projectSettings)
    .values({ workspaceId: args.workspaceId, defaultPhases: args.defaultPhases })
    .onConflictDoUpdate({
      target: projectSettings.workspaceId,
      set: { defaultPhases: args.defaultPhases, updatedAt: new Date() },
    });
  return { defaultPhases: args.defaultPhases };
}
