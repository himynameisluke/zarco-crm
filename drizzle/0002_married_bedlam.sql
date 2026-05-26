CREATE TYPE "public"."inbox_item_source" AS ENUM('granola', 'outlook', 'resend', 'mcp', 'system');--> statement-breakpoint
CREATE TYPE "public"."inbox_item_status" AS ENUM('pending', 'processed', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."inbox_item_type" AS ENUM('transcript', 'email', 'mcp_suggestion', 'bounce', 'other');--> statement-breakpoint
CREATE TABLE "inbox_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "inbox_item_type" NOT NULL,
	"source" "inbox_item_source" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "inbox_item_status" DEFAULT 'pending' NOT NULL,
	"processed_into_activity_id" uuid,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "inbox_items_status_idx" ON "inbox_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inbox_items_received_idx" ON "inbox_items" USING btree ("received_at");