import {
  pgTable,
  pgSchema,
  pgEnum,
  uuid,
  text,
  timestamp,
  bigint,
  integer,
  numeric,
  jsonb,
  date,
  boolean,
  index,
  primaryKey,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const authSchema = pgSchema("auth");
// Supabase-managed table. We declare only the columns we read: id for FKs,
// email to resolve owner/assignee display names in the UI.
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
  email: text("email"),
});

export const dealType = pgEnum("deal_type", [
  "engagement",
  "sale",
  "project",
  "retainer",
]);

export const dealStage = pgEnum("deal_stage", [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
]);

export const projectStatus = pgEnum("project_status", [
  "not_started",
  "in_progress",
  "on_hold",
  "completed",
]);

// Manual field, set by whoever owns the project. Advisory suggestions are
// computed separately (src/lib/projects/health.ts) and surfaced as a chip
// when they disagree with this value — the manual field stays authoritative.
export const projectHealth = pgEnum("project_health", [
  "on_track",
  "at_risk",
  "off_track",
]);

export const projectRiskKind = pgEnum("project_risk_kind", [
  "risk",
  "blocker",
]);

export const projectRiskSeverity = pgEnum("project_risk_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

// Blockers don't carry a likelihood (they're already happening) — nullable.
export const projectRiskLikelihood = pgEnum("project_risk_likelihood", [
  "low",
  "medium",
  "high",
]);

export const projectRiskStatus = pgEnum("project_risk_status", [
  "open",
  "monitoring",
  "resolved",
]);

export const projectTemplateItemKind = pgEnum("project_template_item_kind", [
  "phase",
  "milestone",
  "task",
]);

export const activityType = pgEnum("activity_type", [
  "email",
  "call",
  "meeting",
  "note",
  "status_change",
  "task_completed",
  "quote_sent",
  "quote_viewed",
  "quote_accepted",
  // Project management additions. Phase changes reuse status_change with
  // metadata: {kind:'phase', from, to} rather than a dedicated value.
  "milestone_completed",
  "risk_raised",
  "risk_resolved",
]);

export const activitySource = pgEnum("activity_source", [
  "manual",
  "granola",
  "email_sync",
  "system",
  "mcp",
]);

export const subjectType = pgEnum("subject_type", [
  "contact",
  "organization",
  "deal",
  "project",
]);

// blocked/cancelled added for project management — additive ALTER TYPE, not
// used by anything in migration 0008 itself. Every switch/map over this enum
// must handle all five values (see src/lib/projects/labels.ts).
export const taskStatus = pgEnum("task_status", [
  "todo",
  "in_progress",
  "done",
  "blocked",
  "cancelled",
]);

export const taskPriority = pgEnum("task_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const quoteStatus = pgEnum("quote_status", [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "expired",
]);

export const campaignStatus = pgEnum("campaign_status", [
  "draft",
  "scheduled",
  "sending",
  "sent",
]);

export const emailSendStatus = pgEnum("email_send_status", [
  "queued",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "unsubscribed",
  "failed",
]);

// =============================================================================
// Workspaces
// =============================================================================
// Every CRM row belongs to a workspace. A user can be a member of multiple
// workspaces (their real "Zarco" workspace + a "Demo" workspace, etc) and
// switches between them via a cookie-stored currentWorkspaceId.
//
// Defense in depth:
//   - App-layer: every query scopes by workspaceId (the helper in
//     src/lib/workspace/current.ts resolves it).
//   - RLS: policies require the row's workspaceId to match one the user
//     belongs to (see supabase/policies.sql).

export const workspaceType = pgEnum("workspace_type", ["real", "demo"]);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    type: workspaceType("type").notNull().default("real"),
    ownerId: uuid("owner_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    // Monotonic per-workspace quote-number counter. Bumped atomically
    // (UPDATE ... RETURNING) so concurrent quote creates can't collide and
    // deleting a quote never causes a number to be reissued — unlike the old
    // count(*)+1 scheme.
    quoteCounter: integer("quote_counter").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    // 'owner' for now; expand to admin/member/viewer when team support lands.
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.userId] }),
    index("workspace_members_user_idx").on(t.userId),
  ],
);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    domain: text("domain"),
    website: text("website"),
    industry: text("industry"),
    employeeCount: integer("employee_count"),
    notes: text("notes"),
    ownerId: uuid("owner_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("organizations_workspace_idx").on(t.workspaceId),
    index("organizations_domain_idx").on(t.domain),
  ],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    firstName: text("first_name"),
    lastName: text("last_name"),
    email: text("email"),
    phone: text("phone"),
    title: text("title"),
    linkedinUrl: text("linkedin_url"),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    ownerId: uuid("owner_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("contacts_workspace_idx").on(t.workspaceId),
    index("contacts_email_idx").on(t.email),
    index("contacts_org_idx").on(t.organizationId),
  ],
);

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    type: dealType("type").notNull().default("sale"),
    stage: dealStage("stage").notNull().default("lead"),
    valuePence: bigint("value_pence", { mode: "number" }),
    currency: text("currency").notNull().default("GBP"),
    closeDate: date("close_date"),
    // Why the deal was lost — set when stage transitions to 'lost'. The
    // single most useful field for win/loss reporting later.
    lostReason: text("lost_reason"),
    // When the deal last changed stage. Powers TRUE days-in-stage on the
    // kanban (updatedAt resets on any edit, which lied about stage age).
    stageChangedAt: timestamp("stage_changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    primaryContactId: uuid("primary_contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    ownerId: uuid("owner_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("deals_workspace_idx").on(t.workspaceId),
    index("deals_org_idx").on(t.organizationId),
    index("deals_stage_idx").on(t.stage),
    index("deals_owner_idx").on(t.ownerId),
  ],
);

// =============================================================================
// Contracts — the renewals engine
// =============================================================================
// A contract is what a WON deal becomes when the work is recurring (retainers,
// support agreements, subscriptions). Where deals answer "what might we win?",
// contracts answer "what do we already have, and when does it renew?" —
// the Salesforce contracts / HubSpot recurring-revenue equivalent.
//
// endDate is the renewal date. The /renewals view surfaces contracts ending
// soon; "Create renewal deal" spawns a pre-filled deal and links it back via
// renewalDealId so a contract only ever gets one open renewal opportunity.

export const contractStatus = pgEnum("contract_status", [
  "active",
  "renewed",
  "lapsed",
  "cancelled",
]);

export const contractBillingPeriod = pgEnum("contract_billing_period", [
  "monthly",
  "quarterly",
  "annual",
  "one_off",
]);

export const contracts = pgTable(
  "contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    // The won deal this contract came from.
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "set null" }),
    status: contractStatus("status").notNull().default("active"),
    // Value per billing period (e.g. £2,000 monthly), not lifetime value.
    valuePence: bigint("value_pence", { mode: "number" }),
    currency: text("currency").notNull().default("GBP"),
    billingPeriod: contractBillingPeriod("billing_period")
      .notNull()
      .default("monthly"),
    startDate: date("start_date").notNull(),
    // The renewal date — what the /renewals view keys on.
    endDate: date("end_date").notNull(),
    autoRenew: boolean("auto_renew").notNull().default(false),
    // The renewal opportunity spawned from this contract, if any.
    renewalDealId: uuid("renewal_deal_id").references(() => deals.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    ownerId: uuid("owner_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("contracts_workspace_idx").on(t.workspaceId),
    index("contracts_org_idx").on(t.organizationId),
    index("contracts_deal_idx").on(t.dealId),
    index("contracts_end_idx").on(t.endDate),
    index("contracts_status_idx").on(t.status),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "set null" }),
    // Direct customer link — today an org is only reachable via the deal.
    // Backfilled in migration 0008 from deals.organization_id where set.
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    status: projectStatus("status").notNull().default("not_started"),
    // Manual; advisory suggestions computed in src/lib/projects/health.ts.
    health: projectHealth("health").notNull().default("on_track"),
    description: text("description"),
    successCriteria: text("success_criteria"),
    // Canonical list lives app-side (src/lib/projects/labels.ts), not a DB
    // enum — keeps the list editable without a migration.
    projectType: text("project_type"),
    // Forward reference: project_phases is declared below. Nullable — the
    // project's cursor through its own phases. The AnyPgColumn return-type
    // annotation breaks the circular type inference between projects <->
    // project_phases (project_phases.project_id references back to
    // projects.id) — without it tsc can't resolve either table's type.
    currentPhaseId: uuid("current_phase_id").references(
      (): AnyPgColumn => projectPhases.id,
      { onDelete: "set null" },
    ),
    // Overrides the tasks-derived progress (src/lib/projects/progress.ts)
    // when set; null = computed.
    progressManual: integer("progress_manual"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    // Provenance: which template (if any) generated this project's
    // phases/milestones/tasks.
    templateId: uuid("template_id").references(() => projectTemplates.id, {
      onDelete: "set null",
    }),
    startDate: date("start_date"),
    endDate: date("end_date"),
    notes: text("notes"),
    ownerId: uuid("owner_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("projects_workspace_idx").on(t.workspaceId),
    index("projects_deal_idx").on(t.dealId),
    index("projects_org_idx").on(t.organizationId),
    index("projects_phase_idx").on(t.currentPhaseId),
    index("projects_health_idx").on(t.health),
  ],
);

// =============================================================================
// Project management — phases, milestones, risks/blockers, links, templates
// =============================================================================
// Turns the thin `projects` row into a real implementation workspace. A
// project's phases are an ordered, project-owned sequence (no shared "board
// columns" table — the board view derives its columns from
// project_settings.defaultPhases + whatever phases exist on projects, see
// src/lib/projects/board.ts). Phases carry no status of their own; the
// project's currentPhaseId is the cursor.

export const projectPhases = pgTable(
  "project_phases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("project_phases_workspace_idx").on(t.workspaceId),
    index("project_phases_project_idx").on(t.projectId),
  ],
);

export const projectMilestones = pgTable(
  "project_milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    phaseId: uuid("phase_id").references(() => projectPhases.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description"),
    dueDate: date("due_date"),
    ownerId: uuid("owner_id").references(() => authUsers.id, { onDelete: "set null" }),
    sortOrder: integer("sort_order").notNull().default(0),
    // Overdue = dueDate < today && completedAt is null (see health.ts).
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("project_milestones_workspace_idx").on(t.workspaceId),
    index("project_milestones_project_idx").on(t.projectId),
    index("project_milestones_phase_idx").on(t.phaseId),
    index("project_milestones_due_idx").on(t.dueDate),
  ],
);

export const projectRisks = pgTable(
  "project_risks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: projectRiskKind("kind").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    severity: projectRiskSeverity("severity").notNull(),
    // Blockers don't carry a likelihood — they're already happening.
    likelihood: projectRiskLikelihood("likelihood"),
    ownerId: uuid("owner_id").references(() => authUsers.id, { onDelete: "set null" }),
    mitigation: text("mitigation"),
    resolution: text("resolution"),
    status: projectRiskStatus("status").notNull().default("open"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("project_risks_workspace_idx").on(t.workspaceId),
    index("project_risks_project_idx").on(t.projectId),
    index("project_risks_status_idx").on(t.status),
  ],
);

export const projectLinks = pgTable(
  "project_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url").notNull(),
    // doc/repo/deployment/drive/meeting/other — app-side list, not a DB enum.
    kind: text("kind"),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("project_links_workspace_idx").on(t.workspaceId),
    index("project_links_project_idx").on(t.projectId),
  ],
);

// Templates are workspace-scoped (editable per workspace — org-specific ✓),
// not global fixtures. The seed definitions in src/lib/projects/templates-seed.ts
// are created lazily into a workspace's own rows, never a shared table.
export const projectTemplates = pgTable(
  "project_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description"),
    projectType: text("project_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("project_templates_workspace_idx").on(t.workspaceId)],
);

export const projectTemplateItems = pgTable(
  "project_template_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => projectTemplates.id, { onDelete: "cascade" }),
    kind: projectTemplateItemKind("kind").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    // Which phase a milestone/task belongs to, matched by name against the
    // template's own phase items — not a FK (phases don't exist as rows
    // until the template is expanded onto a real project).
    phaseName: text("phase_name"),
    // due = project start + offsetDays, resolved by expandTemplate().
    offsetDays: integer("offset_days"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("project_template_items_workspace_idx").on(t.workspaceId),
    index("project_template_items_template_idx").on(t.templateId),
  ],
);

// One row per workspace (PK IS the workspace id — no separate id column).
// Holds the default phase sequence the board view + create wizard fall
// back to when a project has no phases of its own yet.
export const projectSettings = pgTable("project_settings", {
  workspaceId: uuid("workspace_id")
    .primaryKey()
    .references(() => workspaces.id, { onDelete: "restrict" }),
  defaultPhases: jsonb("default_phases")
    .$type<string[]>()
    .notNull()
    .default([
      "Discovery",
      "Solution Design",
      "Build",
      "Integration",
      "Testing",
      "Training",
      "Go-Live",
      "Hypercare",
    ]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    type: activityType("type").notNull(),
    source: activitySource("source").notNull().default("manual"),
    subjectType: subjectType("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    subject: text("subject"),
    body: text("body"),
    metadata: jsonb("metadata").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
  },
  (t) => [
    index("activities_workspace_idx").on(t.workspaceId),
    index("activities_subject_idx").on(t.subjectType, t.subjectId),
    index("activities_occurred_idx").on(t.occurredAt),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatus("status").notNull().default("todo"),
    priority: taskPriority("priority").notNull().default("normal"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    subjectType: subjectType("subject_type"),
    subjectId: uuid("subject_id"),
    // Project-management grouping — set only when subjectType is 'project'.
    // Nullable FKs, not enforced against subjectType, to keep tasks usable
    // against every subject type without a check constraint.
    projectPhaseId: uuid("project_phase_id").references(() => projectPhases.id, {
      onDelete: "set null",
    }),
    milestoneId: uuid("milestone_id").references(() => projectMilestones.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
    assignedTo: uuid("assigned_to").references(() => authUsers.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("tasks_workspace_idx").on(t.workspaceId),
    index("tasks_subject_idx").on(t.subjectType, t.subjectId),
    index("tasks_assignee_idx").on(t.assignedTo),
    index("tasks_status_idx").on(t.status),
    index("tasks_phase_idx").on(t.projectPhaseId),
    index("tasks_milestone_idx").on(t.milestoneId),
  ],
);

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    // Unique PER WORKSPACE (see the composite index below), not globally —
    // every workspace runs its own Q-NNNN sequence off workspaces.quote_counter.
    quoteNumber: text("quote_number").notNull(),
    // Quotes MUST be tied to both a deal and an organization. This stops
    // floating quotes that can't be reconciled back to the pipeline. We use
    // onDelete: restrict — if a deal/org has quotes, you have to deal with
    // them explicitly rather than silently nulling references or cascading.
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "restrict" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    status: quoteStatus("status").notNull().default("draft"),
    subtotalPence: bigint("subtotal_pence", { mode: "number" }).notNull().default(0),
    taxRate: numeric("tax_rate", { precision: 5, scale: 4 }).notNull().default("0"),
    totalPence: bigint("total_pence", { mode: "number" }).notNull().default(0),
    currency: text("currency").notNull().default("GBP"),
    validUntil: date("valid_until"),
    notes: text("notes"),
    publicToken: uuid("public_token").notNull().defaultRandom().unique(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("quotes_workspace_idx").on(t.workspaceId),
    index("quotes_deal_idx").on(t.dealId),
    index("quotes_org_idx").on(t.organizationId),
    index("quotes_status_idx").on(t.status),
    uniqueIndex("quotes_workspace_number_uq").on(t.workspaceId, t.quoteNumber),
  ],
);

export const quoteLineItems = pgTable(
  "quote_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    quoteId: uuid("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull().default("1"),
    unitPricePence: bigint("unit_price_pence", { mode: "number" }).notNull(),
    totalPence: bigint("total_pence", { mode: "number" }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    index("quote_line_items_workspace_idx").on(t.workspaceId),
    index("quote_line_items_quote_idx").on(t.quoteId),
  ],
);

export const emailCampaigns = pgTable(
  "email_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    bodyHtml: text("body_html").notNull(),
    status: campaignStatus("status").notNull().default("draft"),
    fromEmail: text("from_email").notNull(),
    fromName: text("from_name"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_campaigns_workspace_idx").on(t.workspaceId)],
);

// =============================================================================
// Inbox — pre-activity items needing triage
// =============================================================================
// Items land here from external sources (Granola transcripts not yet linked
// to a contact, MCP suggestions awaiting approval, Resend bounce events,
// later: raw Outlook messages). Triage converts an inbox_item into a real
// activity attached to a contact / org / deal / project.

export const inboxItemType = pgEnum("inbox_item_type", [
  "transcript",
  "email",
  "mcp_suggestion",
  "bounce",
  "other",
]);

export const inboxItemSource = pgEnum("inbox_item_source", [
  "granola",
  "outlook",
  "resend",
  "mcp",
  "system",
]);

export const inboxItemStatus = pgEnum("inbox_item_status", [
  "pending",
  "processed",
  "dismissed",
]);

export const inboxItems = pgTable(
  "inbox_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    type: inboxItemType("type").notNull(),
    source: inboxItemSource("source").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    metadata: jsonb("metadata").notNull().default({}),
    status: inboxItemStatus("status").notNull().default("pending"),
    // Set when triaged → activity. Lets us audit where an item ended up.
    processedIntoActivityId: uuid("processed_into_activity_id"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("inbox_items_workspace_idx").on(t.workspaceId),
    index("inbox_items_status_idx").on(t.status),
    index("inbox_items_received_idx").on(t.receivedAt),
  ],
);

// =============================================================================
// OAuth 2.1 + MCP Authorization
// =============================================================================
// Implements the server side of MCP's OAuth requirements (RFC 7591 dynamic
// client registration, RFC 7636 PKCE, RFC 8414 + RFC 9728 metadata).
// We act as both the authorization server and the resource server.

export const oauthClients = pgTable("oauth_clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientSecretHash: text("client_secret_hash"),
  clientName: text("client_name").notNull(),
  redirectUris: jsonb("redirect_uris").$type<string[]>().notNull(),
  grantTypes: jsonb("grant_types")
    .$type<string[]>()
    .notNull()
    .default(["authorization_code"]),
  tokenEndpointAuthMethod: text("token_endpoint_auth_method").notNull().default("none"),
  registeredAt: timestamp("registered_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const oauthAuthorizationCodes = pgTable(
  "oauth_authorization_codes",
  {
    code: text("code").primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => oauthClients.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    redirectUri: text("redirect_uri").notNull(),
    codeChallenge: text("code_challenge").notNull(),
    codeChallengeMethod: text("code_challenge_method").notNull(),
    scope: text("scope").notNull().default("mcp"),
    resource: text("resource"),
    // The workspace the user was acting in when they approved consent. Carried
    // onto the access token so MCP calls land in the books the user MEANT —
    // not just their primary workspace. Nullable: legacy grants fall back to
    // primary. Cascade: delete the workspace and its grants die with it.
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("oauth_codes_expires_idx").on(t.expiresAt)],
);

export const oauthAccessTokens = pgTable(
  "oauth_access_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => oauthClients.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    scope: text("scope").notNull().default("mcp"),
    // Copied from the authorization code at exchange — see the comment there.
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    index("oauth_tokens_user_idx").on(t.userId),
    index("oauth_tokens_expires_idx").on(t.expiresAt),
  ],
);

export const emailSends = pgTable(
  "email_sends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    campaignId: uuid("campaign_id").references(() => emailCampaigns.id, {
      onDelete: "set null",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),
    bodyHtml: text("body_html").notNull(),
    status: emailSendStatus("status").notNull().default("queued"),
    resendMessageId: text("resend_message_id"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    clickedAt: timestamp("clicked_at", { withTimezone: true }),
    bouncedAt: timestamp("bounced_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("email_sends_workspace_idx").on(t.workspaceId),
    index("email_sends_campaign_idx").on(t.campaignId),
    index("email_sends_contact_idx").on(t.contactId),
    index("email_sends_status_idx").on(t.status),
  ],
);
