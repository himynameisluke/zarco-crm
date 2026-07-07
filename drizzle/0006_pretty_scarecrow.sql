ALTER TABLE "quotes" DROP CONSTRAINT "quotes_quote_number_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_workspace_number_uq" ON "quotes" USING btree ("workspace_id","quote_number");