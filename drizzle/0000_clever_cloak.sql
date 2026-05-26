CREATE TYPE "public"."activity_source" AS ENUM('manual', 'granola', 'email_sync', 'system');--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('email', 'call', 'meeting', 'note', 'status_change', 'task_completed', 'quote_sent', 'quote_viewed', 'quote_accepted');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'sending', 'sent');--> statement-breakpoint
CREATE TYPE "public"."deal_stage" AS ENUM('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."deal_type" AS ENUM('engagement', 'sale', 'project', 'retainer');--> statement-breakpoint
CREATE TYPE "public"."email_send_status" AS ENUM('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('not_started', 'in_progress', 'on_hold', 'completed');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."subject_type" AS ENUM('contact', 'organization', 'deal', 'project');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'done');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "activity_type" NOT NULL,
	"source" "activity_source" DEFAULT 'manual' NOT NULL,
	"subject_type" "subject_type" NOT NULL,
	"subject_id" uuid NOT NULL,
	"subject" text,
	"body" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text,
	"phone" text,
	"title" text,
	"linkedin_url" text,
	"organization_id" uuid,
	"notes" text,
	"owner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "deal_type" DEFAULT 'sale' NOT NULL,
	"stage" "deal_stage" DEFAULT 'lead' NOT NULL,
	"value_pence" bigint,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"close_date" date,
	"organization_id" uuid,
	"primary_contact_id" uuid,
	"owner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"from_email" text NOT NULL,
	"from_name" text,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid,
	"contact_id" uuid,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"status" "email_send_status" DEFAULT 'queued' NOT NULL,
	"resend_message_id" text,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"clicked_at" timestamp with time zone,
	"bounced_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_access_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"scope" text DEFAULT 'mcp' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oauth_authorization_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"redirect_uri" text NOT NULL,
	"code_challenge" text NOT NULL,
	"code_challenge_method" text NOT NULL,
	"scope" text DEFAULT 'mcp' NOT NULL,
	"resource" text,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_secret_hash" text,
	"client_name" text NOT NULL,
	"redirect_uris" jsonb NOT NULL,
	"grant_types" jsonb DEFAULT '["authorization_code"]'::jsonb NOT NULL,
	"token_endpoint_auth_method" text DEFAULT 'none' NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"website" text,
	"industry" text,
	"employee_count" integer,
	"notes" text,
	"owner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"deal_id" uuid,
	"status" "project_status" DEFAULT 'not_started' NOT NULL,
	"start_date" date,
	"end_date" date,
	"notes" text,
	"owner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(12, 2) DEFAULT '1' NOT NULL,
	"unit_price_pence" bigint NOT NULL,
	"total_pence" bigint NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_number" text NOT NULL,
	"deal_id" uuid,
	"organization_id" uuid,
	"contact_id" uuid,
	"status" "quote_status" DEFAULT 'draft' NOT NULL,
	"subtotal_pence" bigint DEFAULT 0 NOT NULL,
	"tax_rate" numeric(5, 4) DEFAULT '0' NOT NULL,
	"total_pence" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"valid_until" date,
	"notes" text,
	"public_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"sent_at" timestamp with time zone,
	"viewed_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_quote_number_unique" UNIQUE("quote_number"),
	CONSTRAINT "quotes_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"due_at" timestamp with time zone,
	"subject_type" "subject_type",
	"subject_id" uuid,
	"assigned_to" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_primary_contact_id_contacts_id_fk" FOREIGN KEY ("primary_contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_campaign_id_email_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_client_id_oauth_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_client_id_oauth_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_subject_idx" ON "activities" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "activities_occurred_idx" ON "activities" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "contacts_email_idx" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "contacts_org_idx" ON "contacts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "deals_org_idx" ON "deals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "deals_stage_idx" ON "deals" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "deals_owner_idx" ON "deals" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "email_sends_campaign_idx" ON "email_sends" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "email_sends_contact_idx" ON "email_sends" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "email_sends_status_idx" ON "email_sends" USING btree ("status");--> statement-breakpoint
CREATE INDEX "oauth_tokens_user_idx" ON "oauth_access_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_tokens_expires_idx" ON "oauth_access_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "oauth_codes_expires_idx" ON "oauth_authorization_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "organizations_domain_idx" ON "organizations" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "projects_deal_idx" ON "projects" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "quote_line_items_quote_idx" ON "quote_line_items" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "quotes_deal_idx" ON "quotes" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "quotes_org_idx" ON "quotes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "quotes_status_idx" ON "quotes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_subject_idx" ON "tasks" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "tasks_assignee_idx" ON "tasks" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");