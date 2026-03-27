ALTER TABLE "receipt_details" RENAME COLUMN "subaccount" TO "sub_account_id";--> statement-breakpoint
ALTER TABLE "receipt_details" DROP CONSTRAINT "receipt_details_subaccount_sub_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "receipt_details" ADD CONSTRAINT "receipt_details_sub_account_id_sub_accounts_id_fk" FOREIGN KEY ("sub_account_id") REFERENCES "public"."sub_accounts"("id") ON DELETE no action ON UPDATE no action;