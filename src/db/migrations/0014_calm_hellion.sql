ALTER TABLE "receipt_details" RENAME COLUMN "contribution_type_id" TO "contribution_account_id";--> statement-breakpoint
ALTER TABLE "receipt_details" RENAME COLUMN "contributor" TO "contributor_member_id";--> statement-breakpoint
ALTER TABLE "receipt_details" RENAME COLUMN "contributor_group" TO "contributor_group_id";--> statement-breakpoint
ALTER TABLE "receipt_details" RENAME COLUMN "contributor_district" TO "contributor_district_id";--> statement-breakpoint
ALTER TABLE "receipt_details" RENAME COLUMN "contributor_service" TO "contributor_service_id";--> statement-breakpoint
ALTER TABLE "receipt_details" RENAME COLUMN "contributor_cong" TO "contributor_congregation_id";--> statement-breakpoint
ALTER TABLE "receipt_details" DROP CONSTRAINT "receipt_details_contribution_type_id_ledger_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "receipt_details" DROP CONSTRAINT "receipt_details_contributor_group_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "receipt_details" DROP CONSTRAINT "receipt_details_contributor_district_districts_id_fk";
--> statement-breakpoint
ALTER TABLE "receipt_details" DROP CONSTRAINT "receipt_details_contributor_service_services_id_fk";
--> statement-breakpoint
ALTER TABLE "receipt_details" DROP CONSTRAINT "receipt_details_contributor_cong_congregations_id_fk";
--> statement-breakpoint
DROP INDEX "receipt_details_contribution_type_id_idx";--> statement-breakpoint
ALTER TABLE "receipt_details" ADD CONSTRAINT "receipt_details_contribution_account_id_ledger_accounts_id_fk" FOREIGN KEY ("contribution_account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_details" ADD CONSTRAINT "receipt_details_contributor_group_id_groups_id_fk" FOREIGN KEY ("contributor_group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_details" ADD CONSTRAINT "receipt_details_contributor_district_id_districts_id_fk" FOREIGN KEY ("contributor_district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_details" ADD CONSTRAINT "receipt_details_contributor_service_id_services_id_fk" FOREIGN KEY ("contributor_service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_details" ADD CONSTRAINT "receipt_details_contributor_congregation_id_congregations_id_fk" FOREIGN KEY ("contributor_congregation_id") REFERENCES "public"."congregations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receipt_details_contribution_account_id_idx" ON "receipt_details" USING btree ("contribution_account_id");