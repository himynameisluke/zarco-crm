-- =============================================================================
-- Workspaces — phase 1
-- =============================================================================
-- 1. Create workspaces + workspace_members tables (and the workspace_type enum)
-- 2. Insert the 'Zarco' workspace owned by the current user
-- 3. Add workspace_id columns as nullable to every CRM table
-- 4. Backfill every existing CRM row with the Zarco workspace id
-- 5. Make every workspace_id column NOT NULL and add the FK + index
--
-- The single user on the project is hardcoded by id below — this migration is
-- a one-time bootstrap, not portable.
--
-- Wrapped in a transaction so the DB never sits in a half-migrated state.

BEGIN;

-- -- Enum + base tables --------------------------------------------------------
CREATE TYPE "public"."workspace_type" AS ENUM('real', 'demo');

CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" "workspace_type" DEFAULT 'real' NOT NULL,
	"owner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);

CREATE TABLE "workspace_members" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id")
);

ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_users_id_fk"
	FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk"
	FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "workspace_members_user_idx" ON "workspace_members" USING btree ("user_id");

-- -- Seed: the Zarco workspace owned by the current user ----------------------
-- Deterministic IDs so we can reference them in the backfill below.
INSERT INTO "workspaces" ("id", "name", "slug", "type", "owner_id")
VALUES (
	'01234567-aaaa-aaaa-aaaa-000000000001'::uuid,
	'Zarco',
	'zarco',
	'real',
	'189fddbb-cec2-4261-ae84-4687548a1fdc'::uuid
);

INSERT INTO "workspace_members" ("workspace_id", "user_id", "role")
VALUES (
	'01234567-aaaa-aaaa-aaaa-000000000001'::uuid,
	'189fddbb-cec2-4261-ae84-4687548a1fdc'::uuid,
	'owner'
);

-- -- Add workspace_id columns NULLABLE first so we can backfill --------------
ALTER TABLE "activities"       ADD COLUMN "workspace_id" uuid;
ALTER TABLE "contacts"         ADD COLUMN "workspace_id" uuid;
ALTER TABLE "deals"            ADD COLUMN "workspace_id" uuid;
ALTER TABLE "email_campaigns"  ADD COLUMN "workspace_id" uuid;
ALTER TABLE "email_sends"      ADD COLUMN "workspace_id" uuid;
ALTER TABLE "inbox_items"      ADD COLUMN "workspace_id" uuid;
ALTER TABLE "organizations"    ADD COLUMN "workspace_id" uuid;
ALTER TABLE "projects"         ADD COLUMN "workspace_id" uuid;
ALTER TABLE "quote_line_items" ADD COLUMN "workspace_id" uuid;
ALTER TABLE "quotes"           ADD COLUMN "workspace_id" uuid;
ALTER TABLE "tasks"            ADD COLUMN "workspace_id" uuid;

-- -- Backfill everything into the Zarco workspace -----------------------------
UPDATE "activities"       SET "workspace_id" = '01234567-aaaa-aaaa-aaaa-000000000001'::uuid;
UPDATE "contacts"         SET "workspace_id" = '01234567-aaaa-aaaa-aaaa-000000000001'::uuid;
UPDATE "deals"            SET "workspace_id" = '01234567-aaaa-aaaa-aaaa-000000000001'::uuid;
UPDATE "email_campaigns"  SET "workspace_id" = '01234567-aaaa-aaaa-aaaa-000000000001'::uuid;
UPDATE "email_sends"      SET "workspace_id" = '01234567-aaaa-aaaa-aaaa-000000000001'::uuid;
UPDATE "inbox_items"      SET "workspace_id" = '01234567-aaaa-aaaa-aaaa-000000000001'::uuid;
UPDATE "organizations"    SET "workspace_id" = '01234567-aaaa-aaaa-aaaa-000000000001'::uuid;
UPDATE "projects"         SET "workspace_id" = '01234567-aaaa-aaaa-aaaa-000000000001'::uuid;
UPDATE "quote_line_items" SET "workspace_id" = '01234567-aaaa-aaaa-aaaa-000000000001'::uuid;
UPDATE "quotes"           SET "workspace_id" = '01234567-aaaa-aaaa-aaaa-000000000001'::uuid;
UPDATE "tasks"            SET "workspace_id" = '01234567-aaaa-aaaa-aaaa-000000000001'::uuid;

-- -- Now safely make them NOT NULL --------------------------------------------
ALTER TABLE "activities"       ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "contacts"         ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "deals"            ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "email_campaigns"  ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "email_sends"      ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "inbox_items"      ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "organizations"    ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "projects"         ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "quote_line_items" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "quotes"           ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "tasks"            ALTER COLUMN "workspace_id" SET NOT NULL;

-- -- Foreign keys (RESTRICT — can't delete a workspace that has CRM rows) ----
ALTER TABLE "activities"       ADD CONSTRAINT "activities_workspace_id_workspaces_id_fk"       FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "contacts"         ADD CONSTRAINT "contacts_workspace_id_workspaces_id_fk"         FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "deals"            ADD CONSTRAINT "deals_workspace_id_workspaces_id_fk"            FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "email_campaigns"  ADD CONSTRAINT "email_campaigns_workspace_id_workspaces_id_fk"  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "email_sends"      ADD CONSTRAINT "email_sends_workspace_id_workspaces_id_fk"      FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "inbox_items"      ADD CONSTRAINT "inbox_items_workspace_id_workspaces_id_fk"      FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "organizations"    ADD CONSTRAINT "organizations_workspace_id_workspaces_id_fk"    FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "projects"         ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk"         FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "quotes"           ADD CONSTRAINT "quotes_workspace_id_workspaces_id_fk"           FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "tasks"            ADD CONSTRAINT "tasks_workspace_id_workspaces_id_fk"            FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;

-- -- Indexes ------------------------------------------------------------------
CREATE INDEX "activities_workspace_idx"       ON "activities"       USING btree ("workspace_id");
CREATE INDEX "contacts_workspace_idx"         ON "contacts"         USING btree ("workspace_id");
CREATE INDEX "deals_workspace_idx"            ON "deals"            USING btree ("workspace_id");
CREATE INDEX "email_campaigns_workspace_idx"  ON "email_campaigns"  USING btree ("workspace_id");
CREATE INDEX "email_sends_workspace_idx"      ON "email_sends"      USING btree ("workspace_id");
CREATE INDEX "inbox_items_workspace_idx"      ON "inbox_items"      USING btree ("workspace_id");
CREATE INDEX "organizations_workspace_idx"    ON "organizations"    USING btree ("workspace_id");
CREATE INDEX "projects_workspace_idx"         ON "projects"         USING btree ("workspace_id");
CREATE INDEX "quote_line_items_workspace_idx" ON "quote_line_items" USING btree ("workspace_id");
CREATE INDEX "quotes_workspace_idx"           ON "quotes"           USING btree ("workspace_id");
CREATE INDEX "tasks_workspace_idx"            ON "tasks"            USING btree ("workspace_id");

COMMIT;
