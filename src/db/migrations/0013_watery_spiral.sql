DROP INDEX "receipt_details_contribution_date_idx";--> statement-breakpoint
ALTER TABLE "receipt_header" ADD COLUMN "contribution_date" date NOT NULL;--> statement-breakpoint
CREATE INDEX "receipt_header_contribution_date_idx" ON "receipt_header" USING btree ("contribution_date");--> statement-breakpoint
ALTER TABLE "receipt_details" DROP COLUMN "contribution_date";