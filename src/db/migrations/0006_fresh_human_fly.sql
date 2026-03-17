CREATE TYPE "public"."account_type_enum" AS ENUM('assets', 'liability', 'equity', 'income', 'expenses');--> statement-breakpoint
CREATE TYPE "public"."normal_balance_enum" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TABLE "ledger_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"account_type" "account_type_enum" NOT NULL,
	"parent_id" integer,
	"description" varchar(255),
	"is_bank" boolean DEFAULT false NOT NULL,
	"account_no" varchar(100),
	"for_group" boolean DEFAULT false NOT NULL,
	"is_posting" boolean DEFAULT false NOT NULL,
	"normal_balance" "normal_balance_enum" NOT NULL,
	"is_editable" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"congregation_id" integer NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_congregation_id_congregations_id_fk" FOREIGN KEY ("congregation_id") REFERENCES "public"."congregations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ledger_accounts_name_idx" ON "ledger_accounts" USING btree ("name");--> statement-breakpoint
CREATE INDEX "ledger_accounts_account_type_idx" ON "ledger_accounts" USING btree ("account_type");--> statement-breakpoint
CREATE INDEX "ledger_accounts_parent_id_idx" ON "ledger_accounts" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "ledger_accounts_congregation_id_idx" ON "ledger_accounts" USING btree ("congregation_id");--> statement-breakpoint
CREATE INDEX "ledger_accounts_active_idx" ON "ledger_accounts" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_accounts_congregation_id_account_no_unique" ON "ledger_accounts" USING btree ("congregation_id","account_no");