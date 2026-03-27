CREATE TYPE "public"."line_dc" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" varchar PRIMARY KEY NOT NULL,
	"transaction_date" date NOT NULL,
	"line_number" integer NOT NULL,
	"account_id" integer NOT NULL,
	"dc" "line_dc" NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"memo" text,
	"reference" varchar(255),
	"source" varchar(255),
	"source_id" varchar(255),
	"journal_no" integer,
	"congregation_id" integer,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_account_id_ledger_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_congregation_id_congregations_id_fk" FOREIGN KEY ("congregation_id") REFERENCES "public"."congregations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "journal_entries_transaction_date_idx" ON "journal_entries" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "journal_entries_account_id_idx" ON "journal_entries" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "journal_entries_congregation_id_idx" ON "journal_entries" USING btree ("congregation_id");--> statement-breakpoint
CREATE INDEX "journal_entries_journal_no_idx" ON "journal_entries" USING btree ("journal_no");--> statement-breakpoint
CREATE INDEX "journal_entries_line_number_idx" ON "journal_entries" USING btree ("line_number");--> statement-breakpoint
CREATE INDEX "journal_entries_reference_idx" ON "journal_entries" USING btree ("reference");