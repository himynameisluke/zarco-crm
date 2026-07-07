CREATE TYPE "public"."contract_billing_period" AS ENUM('monthly', 'quarterly', 'annual', 'one_off');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('active', 'renewed', 'lapsed', 'cancelled');--> statement-breakpoint
-- NOTE: drizzle-kit emitted CREATE TABLE "auth"."users" here because the
-- schema declaration gained an email column. auth.users is Supabase-managed
-- and already exists — the statement was removed by hand. Do NOT recreate it.
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"organization_id" uuid,
	"deal_id" uuid,
	"status" "contract_status" DEFAULT 'active' NOT NULL,
	"value_pence" bigint,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"billing_period" "contract_billing_period" DEFAULT 'monthly' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"auto_renew" boolean DEFAULT false NOT NULL,
	"renewal_deal_id" uuid,
	"notes" text,
	"owner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "lost_reason" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "stage_changed_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "quote_counter" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Backfill: start each workspace's counter at its current highest quote
-- number so the next generated number continues the sequence instead of
-- colliding with existing Q-NNNN values.
UPDATE "workspaces" w SET "quote_counter" = GREATEST(
  w."quote_counter",
  COALESCE((
    SELECT MAX(NULLIF(regexp_replace(q."quote_number", '\D', '', 'g'), '')::int)
    FROM "quotes" q WHERE q."workspace_id" = w."id"
  ), 0)
);--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_renewal_deal_id_deals_id_fk" FOREIGN KEY ("renewal_deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contracts_workspace_idx" ON "contracts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "contracts_org_idx" ON "contracts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "contracts_deal_idx" ON "contracts" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "contracts_end_idx" ON "contracts" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "contracts_status_idx" ON "contracts" USING btree ("status");