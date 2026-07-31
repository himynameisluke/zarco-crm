import "server-only";
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  activities,
  authUsers,
  contracts,
  deals,
  organizations,
  projectLinks,
  projectMilestones,
  projectPhases,
  projectRisks,
  projectSettings,
  projectTemplateItems,
  projectTemplates,
  projects,
  quotes,
  tasks,
} from "@/lib/db/schema";
import { displayNameFromEmail } from "@/lib/workspace/members";
import { computeProjectMetrics, type ProjectMetrics } from "./metrics";
import { computeProgress } from "./progress";
import { boardColumns, columnForProject, type BoardColumn } from "./board";
import { DEFAULT_PROJECT_PHASES } from "./labels";

// =============================================================================
// The ONLY db-touching file for the project-management feature's read side
// (writes.ts is its mutation counterpart). Every query is workspace-scoped;
// nothing here trusts a caller-supplied workspaceId beyond what
// requireCurrentWorkspace / requireMcpWorkspace already resolved.
// =============================================================================

// -----------------------------------------------------------------------
// /projects list — search/filter/sort/pagination + per-row counts.
// -----------------------------------------------------------------------

export type ListProjectsParams = {
  workspaceId: string;
  q?: string;
  ownerId?: string;
  organizationId?: string;
  status?: string;
  health?: string;
  projectType?: string;
  sort?: "name" | "target_date" | "progress" | "last_activity";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type ListProjectsRow = {
  id: string;
  name: string;
  status: string;
  health: string;
  organizationId: string | null;
  organizationName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  currentPhaseId: string | null;
  currentPhaseName: string | null;
  progress: number | null;
  startDate: string | null;
  endDate: string | null;
  openTaskCount: number;
  blockerCount: number;
  lastActivityAt: Date | null;
  updatedAt: Date;
};

const PROGRESS_SQL = sql<number | null>`coalesce(
  ${projects.progressManual},
  round(
    100.0 *
    (select count(*) from ${tasks} t_done where t_done.subject_type = 'project' and t_done.subject_id = ${projects.id} and t_done.status = 'done')
    / nullif((select count(*) from ${tasks} t_countable where t_countable.subject_type = 'project' and t_countable.subject_id = ${projects.id} and t_countable.status <> 'cancelled'), 0)
  )
)`;

const OPEN_TASK_COUNT_SQL = sql<number>`(
  select count(*)::int from ${tasks} t_open
  where t_open.subject_type = 'project' and t_open.subject_id = ${projects.id}
  and t_open.status in ('todo', 'in_progress', 'blocked')
)`;

const BLOCKER_COUNT_SQL = sql<number>`(
  select count(*)::int from ${projectRisks} r_blocker
  where r_blocker.project_id = ${projects.id} and r_blocker.kind = 'blocker' and r_blocker.status <> 'resolved'
)`;

const LAST_ACTIVITY_SQL = sql<Date | null>`(
  select max(a_last.occurred_at) from ${activities} a_last
  where a_last.subject_type = 'project' and a_last.subject_id = ${projects.id}
)`;

export async function listProjects(
  params: ListProjectsParams,
): Promise<{ rows: ListProjectsRow[]; total: number }> {
  const pageSize = params.pageSize ?? 50;
  const page = Math.max(1, params.page ?? 1);

  const searchCondition: SQL | undefined = params.q
    ? or(ilike(projects.name, `%${params.q}%`), ilike(organizations.name, `%${params.q}%`))
    : undefined;

  const filters = [
    eq(projects.workspaceId, params.workspaceId),
    searchCondition,
    params.ownerId ? eq(projects.ownerId, params.ownerId) : undefined,
    params.organizationId ? eq(projects.organizationId, params.organizationId) : undefined,
    params.status ? eq(projects.status, params.status as (typeof projects.$inferSelect)["status"]) : undefined,
    params.health ? eq(projects.health, params.health as (typeof projects.$inferSelect)["health"]) : undefined,
    params.projectType ? eq(projects.projectType, params.projectType) : undefined,
  ].filter(Boolean) as SQL[];

  const whereClause = and(...filters);

  const sortDir = params.sortDir === "asc" ? asc : desc;
  const orderBy =
    params.sort === "target_date"
      ? [sortDir(projects.endDate)]
      : params.sort === "progress"
        ? [sortDir(PROGRESS_SQL)]
        : params.sort === "last_activity"
          ? [sortDir(LAST_ACTIVITY_SQL)]
          : params.sort === "name"
            ? [sortDir(projects.name)]
            : [desc(projects.updatedAt)];

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        health: projects.health,
        organizationId: projects.organizationId,
        organizationName: organizations.name,
        ownerId: projects.ownerId,
        ownerEmail: authUsers.email,
        currentPhaseId: projects.currentPhaseId,
        currentPhaseName: projectPhases.name,
        progress: PROGRESS_SQL,
        startDate: projects.startDate,
        endDate: projects.endDate,
        openTaskCount: OPEN_TASK_COUNT_SQL,
        blockerCount: BLOCKER_COUNT_SQL,
        lastActivityAt: LAST_ACTIVITY_SQL,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .leftJoin(organizations, eq(projects.organizationId, organizations.id))
      .leftJoin(authUsers, eq(projects.ownerId, authUsers.id))
      .leftJoin(projectPhases, eq(projects.currentPhaseId, projectPhases.id))
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(projects)
      .leftJoin(organizations, eq(projects.organizationId, organizations.id))
      .where(whereClause),
  ]);

  return {
    rows: rows.map((r) => ({ ...r, ownerName: r.ownerEmail ? displayNameFromEmail(r.ownerEmail) : null })),
    total,
  };
}

// -----------------------------------------------------------------------
// Board dataset — columns derived from project_settings.defaultPhases +
// Unphased/Complete, cards bucketed via board.ts's columnForProject.
// -----------------------------------------------------------------------

export type BoardCard = {
  id: string;
  name: string;
  organizationName: string | null;
  ownerName: string | null;
  health: string;
  status: string;
  progress: number | null;
  endDate: string | null;
  currentPhaseId: string | null;
};

export async function boardDataset(
  workspaceId: string,
): Promise<{ columns: BoardColumn[]; projectsByColumn: Record<string, BoardCard[]> }> {
  const [settings, projectRows, phaseRows, taskAgg] = await Promise.all([
    getProjectSettingsOrDefault(workspaceId),
    db
      .select({
        id: projects.id,
        name: projects.name,
        organizationName: organizations.name,
        ownerEmail: authUsers.email,
        health: projects.health,
        status: projects.status,
        progressManual: projects.progressManual,
        endDate: projects.endDate,
        currentPhaseId: projects.currentPhaseId,
      })
      .from(projects)
      .leftJoin(organizations, eq(projects.organizationId, organizations.id))
      .leftJoin(authUsers, eq(projects.ownerId, authUsers.id))
      .where(eq(projects.workspaceId, workspaceId)),
    db
      .select({ id: projectPhases.id, name: projectPhases.name })
      .from(projectPhases)
      .where(eq(projectPhases.workspaceId, workspaceId)),
    db
      .select({
        subjectId: tasks.subjectId,
        done: sql<number>`count(*) filter (where status = 'done')::int`,
        countable: sql<number>`count(*) filter (where status <> 'cancelled')::int`,
      })
      .from(tasks)
      .where(and(eq(tasks.workspaceId, workspaceId), eq(tasks.subjectType, "project")))
      .groupBy(tasks.subjectId),
  ]);

  const taskAggByProject = new Map(taskAgg.map((r) => [r.subjectId, r]));
  const phaseIdToName = new Map(phaseRows.map((p) => [p.id, p.name]));

  // A project's current phase can come from a template that isn't the
  // workspace's default phase sequence (e.g. "Agent configuration") — union
  // those actual names in as extra columns so every rendered project always
  // has somewhere to land (see boardColumns' doc comment).
  const extraPhaseNames = new Set<string>();
  for (const p of projectRows) {
    if (!p.currentPhaseId) continue;
    const name = phaseIdToName.get(p.currentPhaseId);
    if (name) extraPhaseNames.add(name);
  }

  const columns = boardColumns(settings.defaultPhases, Array.from(extraPhaseNames));
  const projectsByColumn: Record<string, BoardCard[]> = {};
  for (const col of columns) projectsByColumn[col.key] = [];

  for (const p of projectRows) {
    const agg = taskAggByProject.get(p.id);
    const computed = agg && agg.countable > 0 ? Math.round((100 * agg.done) / agg.countable) : null;
    const card: BoardCard = {
      id: p.id,
      name: p.name,
      organizationName: p.organizationName,
      ownerName: p.ownerEmail ? displayNameFromEmail(p.ownerEmail) : null,
      health: p.health,
      status: p.status,
      progress: p.progressManual ?? computed,
      endDate: p.endDate,
      currentPhaseId: p.currentPhaseId,
    };
    const column = columnForProject(p, phaseIdToName);
    (projectsByColumn[column] ??= []).push(card);
  }

  return { columns, projectsByColumn };
}

// -----------------------------------------------------------------------
// Timeline dataset — per-project start→end bar + milestones.
// -----------------------------------------------------------------------

export type TimelineMilestone = {
  id: string;
  name: string;
  dueDate: string | null;
  completedAt: Date | null;
  overdue: boolean;
};

export type TimelineProject = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  currentPhaseName: string | null;
  status: string;
  milestones: TimelineMilestone[];
};

export async function timelineDataset(workspaceId: string): Promise<TimelineProject[]> {
  const [projectRows, milestoneRows] = await Promise.all([
    db
      .select({
        id: projects.id,
        name: projects.name,
        startDate: projects.startDate,
        endDate: projects.endDate,
        status: projects.status,
        currentPhaseName: projectPhases.name,
      })
      .from(projects)
      .leftJoin(projectPhases, eq(projects.currentPhaseId, projectPhases.id))
      .where(eq(projects.workspaceId, workspaceId))
      .orderBy(asc(projects.startDate)),
    db
      .select({
        id: projectMilestones.id,
        projectId: projectMilestones.projectId,
        name: projectMilestones.name,
        dueDate: projectMilestones.dueDate,
        completedAt: projectMilestones.completedAt,
      })
      .from(projectMilestones)
      .where(eq(projectMilestones.workspaceId, workspaceId))
      .orderBy(asc(projectMilestones.dueDate)),
  ]);

  const now = new Date();
  const milestonesByProject = new Map<string, TimelineMilestone[]>();
  for (const m of milestoneRows) {
    const overdue = Boolean(m.dueDate && !m.completedAt && new Date(m.dueDate) < now);
    const list = milestonesByProject.get(m.projectId) ?? [];
    list.push({ id: m.id, name: m.name, dueDate: m.dueDate, completedAt: m.completedAt, overdue });
    milestonesByProject.set(m.projectId, list);
  }

  return projectRows.map((p) => ({
    ...p,
    milestones: milestonesByProject.get(p.id) ?? [],
  }));
}

// -----------------------------------------------------------------------
// Overview metrics — feeds metrics.ts's pure computeProjectMetrics.
// -----------------------------------------------------------------------

export async function overviewMetrics(
  workspaceId: string,
  now: Date = new Date(),
): Promise<ProjectMetrics> {
  const [projectRows, taskRows, riskRows] = await Promise.all([
    db
      .select({
        id: projects.id,
        status: projects.status,
        health: projects.health,
        progressManual: projects.progressManual,
        completedAt: projects.completedAt,
      })
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId)),
    db
      .select({
        subjectId: tasks.subjectId,
        status: tasks.status,
        dueAt: tasks.dueAt,
      })
      .from(tasks)
      .where(and(eq(tasks.workspaceId, workspaceId), eq(tasks.subjectType, "project"))),
    db
      .select({ kind: projectRisks.kind, status: projectRisks.status })
      .from(projectRisks)
      .where(eq(projectRisks.workspaceId, workspaceId)),
  ]);

  // Per-project task grouping so effective progress (manual override, else
  // done/(total-cancelled) via the shared progress.ts core) matches what the
  // detail page and board would show for the same project.
  const tasksByProject = new Map<string, { status: (typeof tasks.$inferSelect)["status"] }[]>();
  for (const t of taskRows) {
    if (!t.subjectId) continue;
    const list = tasksByProject.get(t.subjectId) ?? [];
    list.push({ status: t.status });
    tasksByProject.set(t.subjectId, list);
  }

  const metricsProjects = projectRows.map((p) => ({
    status: p.status,
    health: p.health,
    progress: p.progressManual ?? computeProgress(tasksByProject.get(p.id) ?? []),
    completedAt: p.completedAt,
  }));

  return computeProjectMetrics(
    metricsProjects,
    taskRows.map((t) => ({ status: t.status, dueAt: t.dueAt })),
    riskRows,
    now,
  );
}

// -----------------------------------------------------------------------
// Project detail bundle.
// -----------------------------------------------------------------------

export type ProjectDetail = {
  project: typeof projects.$inferSelect;
  ownerName: string | null;
  organization: { id: string; name: string; domain: string | null } | null;
  deal: {
    id: string;
    name: string;
    stage: string;
    valuePence: number | null;
    currency: string;
    closeDate: string | null;
  } | null;
  quotes: (typeof quotes.$inferSelect)[];
  contract: typeof contracts.$inferSelect | null;
  templateName: string | null;
  phases: (typeof projectPhases.$inferSelect)[];
  milestones: (typeof projectMilestones.$inferSelect)[];
  risks: (typeof projectRisks.$inferSelect)[];
  tasks: (typeof tasks.$inferSelect)[];
  links: (typeof projectLinks.$inferSelect)[];
  recentActivities: (typeof activities.$inferSelect)[];
};

export async function getProjectDetail(
  workspaceId: string,
  id: string,
): Promise<ProjectDetail | null> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
    .limit(1);
  if (!project) return null;

  const [
    ownerRow,
    organization,
    deal,
    template,
    phases,
    milestones,
    risks,
    projectTasks,
    links,
    recentActivities,
  ] = await Promise.all([
    project.ownerId
      ? db.select({ email: authUsers.email }).from(authUsers).where(eq(authUsers.id, project.ownerId)).limit(1)
      : Promise.resolve([]),
    project.organizationId
      ? db
          .select({ id: organizations.id, name: organizations.name, domain: organizations.domain })
          .from(organizations)
          .where(and(eq(organizations.id, project.organizationId), eq(organizations.workspaceId, workspaceId)))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    project.dealId
      ? db
          .select({
            id: deals.id,
            name: deals.name,
            stage: deals.stage,
            valuePence: deals.valuePence,
            currency: deals.currency,
            closeDate: deals.closeDate,
          })
          .from(deals)
          .where(and(eq(deals.id, project.dealId), eq(deals.workspaceId, workspaceId)))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    project.templateId
      ? db
          .select({ name: projectTemplates.name })
          .from(projectTemplates)
          .where(eq(projectTemplates.id, project.templateId))
          .limit(1)
          .then((r) => r[0]?.name ?? null)
      : Promise.resolve(null),
    db
      .select()
      .from(projectPhases)
      .where(and(eq(projectPhases.projectId, id), eq(projectPhases.workspaceId, workspaceId)))
      .orderBy(asc(projectPhases.sortOrder)),
    db
      .select()
      .from(projectMilestones)
      .where(and(eq(projectMilestones.projectId, id), eq(projectMilestones.workspaceId, workspaceId)))
      .orderBy(asc(projectMilestones.sortOrder), asc(projectMilestones.dueDate)),
    db
      .select()
      .from(projectRisks)
      .where(and(eq(projectRisks.projectId, id), eq(projectRisks.workspaceId, workspaceId)))
      .orderBy(desc(projectRisks.createdAt)),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.subjectType, "project"), eq(tasks.subjectId, id), eq(tasks.workspaceId, workspaceId)))
      .orderBy(asc(tasks.sortOrder), asc(tasks.dueAt)),
    db
      .select()
      .from(projectLinks)
      .where(and(eq(projectLinks.projectId, id), eq(projectLinks.workspaceId, workspaceId)))
      .orderBy(desc(projectLinks.createdAt)),
    db
      .select()
      .from(activities)
      .where(and(eq(activities.subjectType, "project"), eq(activities.subjectId, id), eq(activities.workspaceId, workspaceId)))
      .orderBy(desc(activities.occurredAt))
      .limit(20),
  ]);

  const dealValuePence = deal?.valuePence != null ? Number(deal.valuePence) : null;

  const projectQuotes = deal
    ? await db
        .select()
        .from(quotes)
        .where(and(eq(quotes.dealId, deal.id), eq(quotes.workspaceId, workspaceId)))
        .orderBy(desc(quotes.createdAt))
    : [];

  const contractCondition = project.organizationId
    ? eq(contracts.organizationId, project.organizationId)
    : deal
      ? eq(contracts.dealId, deal.id)
      : undefined;
  const [contract] = contractCondition
    ? await db
        .select()
        .from(contracts)
        .where(and(eq(contracts.workspaceId, workspaceId), contractCondition))
        .orderBy(desc(contracts.updatedAt))
        .limit(1)
    : [];

  return {
    project,
    ownerName: ownerRow[0]?.email ? displayNameFromEmail(ownerRow[0].email) : null,
    organization,
    deal: deal ? { ...deal, valuePence: dealValuePence } : null,
    quotes: projectQuotes,
    contract: contract ?? null,
    templateName: template,
    phases,
    milestones,
    risks,
    tasks: projectTasks,
    links,
    recentActivities,
  };
}

export async function getProjectActivities(
  workspaceId: string,
  projectId: string,
  page = 1,
  pageSize = 20,
): Promise<{ rows: (typeof activities.$inferSelect)[]; total: number }> {
  const whereClause = and(
    eq(activities.subjectType, "project"),
    eq(activities.subjectId, projectId),
    eq(activities.workspaceId, workspaceId),
  );
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(activities)
      .where(whereClause)
      .orderBy(desc(activities.occurredAt))
      .limit(pageSize)
      .offset((Math.max(1, page) - 1) * pageSize),
    db.select({ total: sql<number>`count(*)::int` }).from(activities).where(whereClause),
  ]);
  return { rows, total };
}

// -----------------------------------------------------------------------
// Templates — list/detail.
// -----------------------------------------------------------------------

export async function listTemplates(
  workspaceId: string,
): Promise<(typeof projectTemplates.$inferSelect)[]> {
  return db
    .select()
    .from(projectTemplates)
    .where(eq(projectTemplates.workspaceId, workspaceId))
    .orderBy(asc(projectTemplates.name));
}

export async function getTemplateDetail(
  workspaceId: string,
  templateId: string,
): Promise<{
  template: typeof projectTemplates.$inferSelect;
  items: (typeof projectTemplateItems.$inferSelect)[];
} | null> {
  const [template] = await db
    .select()
    .from(projectTemplates)
    .where(and(eq(projectTemplates.id, templateId), eq(projectTemplates.workspaceId, workspaceId)))
    .limit(1);
  if (!template) return null;

  const items = await db
    .select()
    .from(projectTemplateItems)
    .where(and(eq(projectTemplateItems.templateId, templateId), eq(projectTemplateItems.workspaceId, workspaceId)))
    .orderBy(asc(projectTemplateItems.kind), asc(projectTemplateItems.sortOrder));

  return { template, items };
}

// -----------------------------------------------------------------------
// project_settings — get-or-default (read half; updateProjectSettingsCore
// in writes.ts is the write half).
// -----------------------------------------------------------------------

export async function getProjectSettingsOrDefault(
  workspaceId: string,
): Promise<{ workspaceId: string; defaultPhases: string[]; updatedAt: Date | null }> {
  const [row] = await db
    .select()
    .from(projectSettings)
    .where(eq(projectSettings.workspaceId, workspaceId))
    .limit(1);
  if (row) return row;
  return { workspaceId, defaultPhases: [...DEFAULT_PROJECT_PHASES], updatedAt: null };
}

/** Convenience: ids-only helper for overdue-work queries elsewhere (MCP list_overdue_project_work). */
export async function listOverdueProjectWork(
  workspaceId: string,
  now: Date = new Date(),
): Promise<{
  overdueTasks: { id: string; title: string; projectId: string; projectName: string; dueAt: Date | null }[];
  overdueMilestones: { id: string; name: string; projectId: string; projectName: string; dueDate: string | null }[];
}> {
  const nowStr = now.toISOString();
  const [overdueTasks, overdueMilestones] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        projectId: tasks.subjectId,
        projectName: projects.name,
        dueAt: tasks.dueAt,
      })
      .from(tasks)
      .innerJoin(projects, and(eq(tasks.subjectId, projects.id), eq(projects.workspaceId, workspaceId)))
      .where(
        and(
          eq(tasks.workspaceId, workspaceId),
          eq(tasks.subjectType, "project"),
          inArray(tasks.status, ["todo", "in_progress", "blocked"]),
          sql`${tasks.dueAt} < ${nowStr}::timestamptz`,
        ),
      )
      .orderBy(asc(tasks.dueAt)),
    db
      .select({
        id: projectMilestones.id,
        name: projectMilestones.name,
        projectId: projectMilestones.projectId,
        projectName: projects.name,
        dueDate: projectMilestones.dueDate,
      })
      .from(projectMilestones)
      .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
      .where(
        and(
          eq(projectMilestones.workspaceId, workspaceId),
          sql`${projectMilestones.completedAt} is null`,
          sql`${projectMilestones.dueDate} < current_date`,
        ),
      )
      .orderBy(asc(projectMilestones.dueDate)),
  ]);

  return {
    overdueTasks: overdueTasks.map((t) => ({ ...t, projectId: t.projectId as string })),
    overdueMilestones,
  };
}
