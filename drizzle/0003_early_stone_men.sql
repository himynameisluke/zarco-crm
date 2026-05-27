ALTER TABLE "quotes" DROP CONSTRAINT "quotes_deal_id_deals_id_fk";
--> statement-breakpoint
ALTER TABLE "quotes" DROP CONSTRAINT "quotes_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "deal_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;