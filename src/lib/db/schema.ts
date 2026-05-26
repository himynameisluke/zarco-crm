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
  index,
} from "drizzle-orm/pg-core";

const authSchema = pgSchema("auth");
const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
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
]);

export const activitySource = pgEnum("activity_source", [
  "manual",
  "granola",
  "email_sync",
  "system",
]);

export const subjectType = pgEnum("subject_type", [
  "contact",
  "organization",
  "deal",
  "project",
]);

export const taskStatus = pgEnum("task_status", [
  "todo",
  "in_progress",
  "done",
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

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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
  (t) => [index("organizations_domain_idx").on(t.domain)],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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
    index("contacts_email_idx").on(t.email),
    index("contacts_org_idx").on(t.organizationId),
  ],
);

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    type: dealType("type").notNull().default("sale"),
    stage: dealStage("stage").notNull().default("lead"),
    valuePence: bigint("value_pence", { mode: "number" }),
    currency: text("currency").notNull().default("GBP"),
    closeDate: date("close_date"),
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
    index("deals_org_idx").on(t.organizationId),
    index("deals_stage_idx").on(t.stage),
    index("deals_owner_idx").on(t.ownerId),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "set null" }),
    status: projectStatus("status").notNull().default("not_started"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    notes: text("notes"),
    ownerId: uuid("owner_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("projects_deal_idx").on(t.dealId)],
);

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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
    index("activities_subject_idx").on(t.subjectType, t.subjectId),
    index("activities_occurred_idx").on(t.occurredAt),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatus("status").notNull().default("todo"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    subjectType: subjectType("subject_type"),
    subjectId: uuid("subject_id"),
    assignedTo: uuid("assigned_to").references(() => authUsers.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("tasks_subject_idx").on(t.subjectType, t.subjectId),
    index("tasks_assignee_idx").on(t.assignedTo),
    index("tasks_status_idx").on(t.status),
  ],
);

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteNumber: text("quote_number").notNull().unique(),
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "set null" }),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
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
    index("quotes_deal_idx").on(t.dealId),
    index("quotes_org_idx").on(t.organizationId),
    index("quotes_status_idx").on(t.status),
  ],
);

export const quoteLineItems = pgTable(
  "quote_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull().default("1"),
    unitPricePence: bigint("unit_price_pence", { mode: "number" }).notNull(),
    totalPence: bigint("total_pence", { mode: "number" }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("quote_line_items_quote_idx").on(t.quoteId)],
);

export const emailCampaigns = pgTable("email_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
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
});

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
    index("email_sends_campaign_idx").on(t.campaignId),
    index("email_sends_contact_idx").on(t.contactId),
    index("email_sends_status_idx").on(t.status),
  ],
);
