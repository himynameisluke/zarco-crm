# Zarco CRM — Project Management build-out (2026-07-29)

Turn the CRM's thin `projects` entity into a real implementation-management
workspace (Monday-style), **inside the CRM, following its conventions exactly**.
Luke's call: no standalone PM product — build it into the CRM.

## What exists today (verified)

- `projects` table: workspaceId, name, dealId (set null), status enum
  `project_status` (not_started/in_progress/on_hold/completed), startDate,
  endDate, notes, ownerId, timestamps. Route quartet
  `src/app/(app)/projects/{page,actions,schema,new,[id],[id]/edit}` — plain
  200-row table, no search/board/detail workspace.
- `tasks`: polymorphic `(subjectType, subjectId)` incl. `project`; status enum
  `task_status` (todo/in_progress/done); dueAt, assignedTo, completedAt.
- `activities`: polymorphic incl. `project`; type enum incl. `status_change`,
  `task_completed`, `note`; `metadata jsonb`; source enum incl. `system`, `mcp`.
- Conventions: requireUser + requireCurrentWorkspace first; zod schema.ts +
  `{error}` returns; `useActionForm`; `entityInWorkspace` for every
  user-supplied FK (Drizzle bypasses RLS — app layer IS the tenant boundary);
  revalidatePath; deals Kanban = the board precedent; contacts list = the
  search/pagination/CSV precedent; pure-core/io-shell + colocated vitest;
  migrations via `pnpm db:generate` → `pnpm db:migrate` (NEVER db:push);
  ESLint CLI broken — gates are `pnpm test`, `tsc --noEmit`, `pnpm build`.
- Latest migration: `0007`. This work = `0008` (one migration, additive only).
- ⚠️ lucide `Eye` icon broken in pinned version — never import it.
- ⚠️ Branch `fix/mcp-money-units` (1 commit) exists unmerged — do not touch.

## Schema changes (migration 0008 — additive, reversible)

Extend `projects`:
- `organizationId` uuid → organizations set null (direct customer link; today
  only reachable via deal). Backfill in-migration: `update projects set
  organization_id = deals.organization_id from deals where projects.deal_id =
  deals.id and projects.organization_id is null`.
- `health` new enum `project_health` (on_track/at_risk/off_track), notNull
  default on_track. Manual field; advisory warnings computed (below).
- `description` text (summary/scope) · `successCriteria` text.
- `projectType` text null (canonical list app-side: console_implementation /
  consultancy / automation / bespoke_build / agent_deployment / integration /
  other — labels in lib).
- `currentPhaseId` uuid → project_phases set null.
- `progressManual` integer null (0–100 override; null = computed from tasks).
- `completedAt` timestamptz null (stamped when status → completed).
- `templateId` uuid → project_templates set null (provenance).

New tables (all: uuid PK defaultRandom, workspaceId → workspaces restrict,
createdAt/updatedAt defaultNow; CRM conventions):
- `project_phases`: projectId cascade, name, sortOrder int. (No status column —
  the project's currentPhaseId is the cursor.)
- `project_milestones`: projectId cascade, phaseId → project_phases set null,
  name, description, dueDate date, ownerId → auth.users set null, sortOrder,
  completedAt timestamptz null. Overdue = dueDate < today && !completedAt.
- `project_risks`: projectId cascade, kind enum `project_risk_kind`
  (risk/blocker), title, description, severity enum `project_risk_severity`
  (low/medium/high/critical), likelihood enum `project_risk_likelihood`
  (low/medium/high) NULL (blockers have none), ownerId set null, mitigation
  text, resolution text, status enum `project_risk_status`
  (open/monitoring/resolved), resolvedAt timestamptz null.
- `project_links`: projectId cascade, title, url, kind text null
  (doc/repo/deployment/drive/meeting/other), createdBy set null.
- `project_templates`: workspace-scoped: name, description, projectType text
  null, createdAt/updatedAt. Editable per workspace (org-specific ✓).
- `project_template_items`: templateId cascade, kind enum
  `project_template_item_kind` (phase/milestone/task), name, description,
  phaseName text null (which phase a milestone/task belongs to, matched by
  name), offsetDays int null (due = project start + offsetDays), sortOrder.
- `project_settings`: workspaceId PK (no separate id), `defaultPhases` jsonb
  (text[], default the canonical seq: Discovery, Solution Design, Build,
  Integration, Testing, Training, Go-Live, Hypercare), `updatedAt`.

Extend `tasks`:
- `priority` new enum `task_priority` (low/normal/high/urgent) notNull default
  normal.
- `projectPhaseId` uuid → project_phases set null · `milestoneId` uuid →
  project_milestones set null · `sortOrder` int notNull default 0.
- `task_status` enum: ADD VALUES `blocked`, `cancelled` (additive ALTER TYPE;
  never used within migration 0008 itself). Sweep EVERY existing switch/record
  over task status (tasks page, MCP tools, anywhere `todo|in_progress|done`
  is matched) to handle the new values — the vitest suite must include an
  exhaustiveness check on the status→label maps.

Enum `activity_type`: ADD VALUES `milestone_completed`, `risk_raised`,
`risk_resolved`. Phase changes reuse `status_change` with
`metadata: {kind:'phase', from, to}`. Sweep activity rendering for default-case
safety. Every significant mutation writes an activity (`subjectType:'project'`)
— created, status/phase/owner change, task created/completed, milestone
completed, risk raised/resolved, link added — actor from session, source
manual/mcp/system as appropriate.

After migrating: RLS — mirror `supabase/policies.sql` treatment for the new
tables (workspace-membership policies like existing tables; keep the file the
source of truth and apply it).

## Pure cores (lib/projects/*, all unit-tested, no db imports)

- `progress.ts` — `computeProgress(tasks)`: done / (total − cancelled), null
  when no countable tasks; `effectiveProgress(project, tasks)` respects
  progressManual.
- `health.ts` — `healthAdvisories({project, milestones, risks, tasks, now})` →
  list of {severity, label} (overdue milestones, open critical/high blockers,
  overdue high/urgent tasks, past target end date) + `suggestedHealth`. Manual
  `health` stays authoritative; UI shows an advisory chip when suggestion is
  worse than the set value.
- `template.ts` — `expandTemplate(template, items, {startDate})` → {phases[],
  milestones[], tasks[]} with resolved dates (offsetDays), phase matching by
  name, stable sort. Used by the create wizard inside ONE transaction.
- `board.ts` — column derivation: workspace defaultPhases + "Unphased" +
  "Complete"; `moveProject(project, targetColumn, projectPhases)` → the
  mutation plan (set currentPhaseId; append phase to project when it lacks the
  target name; status transitions when moving to/from Complete).
- `metrics.ts` — overview stat computation from prefetched rows (active, at
  risk, blocked, overdue tasks, due this week, avg progress, completed this
  month).
- `queries.ts` — the ONLY db-touching file ("server-only"), CRM reports pattern.

## Routes / UI (CRM design system as-is — dark ink, magenta, shadcn)

- **`/projects`** — rebuilt. Header metric cards (from `metrics.ts`, real
  queries). View switcher (URL param `view=table|board|timeline`, inverted
  segmented tabs like the topbar pattern):
  - **Table**: columns name · customer (org) · owner · phase · status · health ·
    progress bar · start · target · days remaining/overdue · open tasks ·
    blockers · last activity. GET-form search `q`; filters owner / organization
    / status / health / type as GET params; sortable (name, target date,
    progress, last activity) via `sort=` param; pagination 50 (contacts
    pattern); CSV export route `projects/export/route.ts`.
  - **Board**: Monday-style columns from `board.ts` (default phases +
    Unphased + Complete), project cards (name, org, owner avatar, progress,
    health dot, due). Drag-drop between columns — reuse the deals-Kanban
    interaction pattern exactly: optimistic move, server action persists
    (currentPhase change + `status_change` activity + timestamps), rollback on
    `{error}` + sonner toast.
  - **Timeline**: per-project horizontal bar (start→target) on a month-scaled
    axis with today line, milestone dots (overdue = danger), current phase
    label. CSS/SVG only, no chart lib. Genuinely readable, not a Gantt cosplay.
- **`/projects/new`** — wizard (single page, progressive sections): customer
  (entity-combobox over organizations) → name/type/owner (workspace members) →
  dates → template select (or "blank") → PREVIEW of generated phases/
  milestones/tasks (from `expandTemplate`) → create. One transaction: project +
  phases + milestones + tasks + `note` activity "Project created". Deal link
  optional (existing field).
- **`/projects/[id]`** — the workspace. Header: name, org (link to CRM org),
  status select, health select + advisory chip, phase stepper (click = set
  phase), progress bar (+ manual-override affordance), owner, dates, edit
  button. Sections (anchor tabs like the CRM detail pages):
  - **Overview**: description, success criteria, commercial context (linked
    deal value/stage, quotes, contract if org has one — read-only pulls),
    next milestone, open blockers, latest activity preview.
  - **Tasks**: grouped by status (todo / in_progress / blocked / done;
    cancelled collapsed), quick-add composer (title + assignee + due +
    priority), row edit dialog, complete toggle, drag between status groups
    (same optimistic pattern), bulk select → status/assignee, filter by
    assignee/milestone/phase. Completion writes `task_completed` activity +
    recomputes progress display.
  - **Milestones**: list w/ due, owner, phase, complete action; overdue
    highlighted danger; completing writes `milestone_completed` activity.
  - **Risks & blockers**: register table (kind, severity, likelihood, owner,
    status, raised, resolved), raise dialog, edit/resolve dialog; activities
    on raise/resolve.
  - **Activity**: the project's activities timeline (existing activity
    rendering, extended for new types).
  - **Notes**: existing polymorphic note composer against the project.
  - **Links**: list + add dialog (title, url, kind), external-link rows.
- **`/projects/[id]/edit`** — extend existing form with new fields.
- **`/settings/projects`** — templates CRUD (list, create/edit template +
  items editor with kind/phase/offset/sort), default phase list editor
  (project_settings). Admin-ish: any member for now (CRM has no real role
  split yet — workspace_members.role defaults 'owner'); note in docs.
- **`/tasks`** — update for new statuses + priority chip; nothing else.
- **Home dashboard** — leave untouched (follow-up note).

Seed templates (per workspace, created lazily on first visit to templates
settings or by seed script — NOT a prod data migration): **Zarco Console
Implementation** (Discovery & stakeholder mapping → CRM/data audit → Workspace
configuration → Knowledge ingestion → Agent configuration → Integrations →
UAT → Training → Go-live → Hypercare & review, with milestones + tasks +
offsets) and **Bespoke Software Build** (Discovery → Requirements → Solution
design → Technical spec → Build → Internal testing → Customer testing →
Deployment → Documentation → Handover & support).

## MCP (server 0.6.0 → 0.7.0) — closes a named backlog item

New `src/lib/mcp/tools/projects.ts`: `list_projects` (filters status/health/
org), `get_project` (header + phases + milestones + open risks + task counts +
recent activity), `create_project` (optional templateId — same expandTemplate
transaction), `update_project` (status/health/phase/dates/owner — writes the
same activities as the UI), `add_project_task`, `complete_milestone`,
`raise_project_risk`, `resolve_project_risk`, `list_overdue_project_work`
(overdue tasks + milestones across projects). All through `requireMcpWorkspace`
+ `entityInWorkspace`; task/activity writes reuse the SAME lib functions as
server actions (no logic forking). Version bump + tool docs.

## Tests

Colocated vitest on every pure core (progress, health, template expansion,
board derivation, metrics, status-label exhaustiveness) + existing suite stays
green. Gates: `pnpm test` → `tsc --noEmit` → `pnpm build`.

## Migration/deploy sequence

1. Schema edit → `pnpm db:generate` (0008) → review SQL → `pnpm db:migrate`
   against live (additive; existing prod data untouched; org backfill runs).
2. Apply updated `supabase/policies.sql` for new tables.
3. Build code on branch `feat/project-management`; gates green; merge to main;
   push (Vercel auto-deploys, ~2 min); live verify on zarco-crm.vercel.app
   using the Demo workspace.
