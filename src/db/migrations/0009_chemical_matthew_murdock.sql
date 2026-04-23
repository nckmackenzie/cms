ALTER TABLE "expenses_header" ALTER COLUMN "congregation_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses_header" ADD COLUMN "paid_from_petty_cash" boolean DEFAULT false NOT NULL;