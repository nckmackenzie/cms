ALTER TABLE "ledger_accounts" ALTER COLUMN "account_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."account_type_enum";--> statement-breakpoint
CREATE TYPE "public"."account_type_enum" AS ENUM('asset', 'liability', 'equity', 'income', 'expense');--> statement-breakpoint
ALTER TABLE "ledger_accounts" ALTER COLUMN "account_type" SET DATA TYPE "public"."account_type_enum" USING "account_type"::"public"."account_type_enum";