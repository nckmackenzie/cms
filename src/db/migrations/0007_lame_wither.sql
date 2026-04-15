ALTER TABLE "fund_requisitions" ADD COLUMN "payment_method" "bank_transaction_method_enum";--> statement-breakpoint
ALTER TABLE "fund_requisitions" ADD COLUMN "reference" varchar(255);--> statement-breakpoint
ALTER TABLE "fund_requisitions" ADD COLUMN "debiting_account_id" integer;--> statement-breakpoint
ALTER TABLE "fund_requisitions" ADD COLUMN "crediting_account_id" integer;--> statement-breakpoint
ALTER TABLE "fund_requisitions" ADD COLUMN "bank_id" integer;--> statement-breakpoint
ALTER TABLE "fund_requisitions" ADD CONSTRAINT "fund_requisitions_debiting_account_id_ledger_accounts_id_fk" FOREIGN KEY ("debiting_account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_requisitions" ADD CONSTRAINT "fund_requisitions_crediting_account_id_ledger_accounts_id_fk" FOREIGN KEY ("crediting_account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_requisitions" ADD CONSTRAINT "fund_requisitions_bank_id_ledger_accounts_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fund_requisitions_reference_idx" ON "fund_requisitions" USING btree ("reference");