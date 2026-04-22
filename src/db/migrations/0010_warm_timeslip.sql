ALTER TABLE "expenses_detail" ALTER COLUMN "expense_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses_detail" ALTER COLUMN "account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses_detail" ALTER COLUMN "description" DROP NOT NULL;