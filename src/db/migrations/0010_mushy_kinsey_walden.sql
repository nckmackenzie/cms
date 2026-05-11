ALTER TABLE "expenses_header" ALTER COLUMN "congregation_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses_header" ADD COLUMN "paid_from_petty_cash" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "petty_cash" ADD COLUMN "debiting_account_id" integer;--> statement-breakpoint
ALTER TABLE "petty_cash" ADD CONSTRAINT "petty_cash_debiting_account_id_ledger_accounts_id_fk" FOREIGN KEY ("debiting_account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;