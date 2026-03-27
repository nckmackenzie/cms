CREATE TYPE "public"."contribution_category_enum" AS ENUM('member', 'group', 'district', 'service', 'congregation');--> statement-breakpoint
CREATE TYPE "public"."payment_method_enum" AS ENUM('cash', 'mpesa', 'bank', 'cheque');--> statement-breakpoint
CREATE TABLE "groups" (
	"id" varchar PRIMARY KEY NOT NULL,
	"group_name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp,
	"congregation_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"header_id" varchar NOT NULL,
	"contribution_date" date NOT NULL,
	"contribution_type_id" integer NOT NULL,
	"payment_method" "payment_method_enum" NOT NULL,
	"bank_id" integer,
	"amount" numeric(18, 2) NOT NULL,
	"category" "contribution_category_enum" NOT NULL,
	"contributor" varchar,
	"contributor_group" varchar,
	"contributor_district" integer,
	"contributor_service" varchar,
	"contributor_cong" integer,
	"payment_reference" varchar(255),
	"narration" varchar(50),
	"income_type" integer NOT NULL,
	"for_group" boolean DEFAULT false NOT NULL,
	"subaccount" varchar
);
--> statement-breakpoint
CREATE TABLE "receipt_header" (
	"id" varchar PRIMARY KEY NOT NULL,
	"receipt_no" varchar(15),
	"posted_by" integer NOT NULL,
	"congregation_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"service_time" varchar NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp,
	"congregation_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sub_accounts" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"bank_id" integer,
	"account_id" integer,
	"group_id" varchar,
	"district_id" integer,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_congregation_id_congregations_id_fk" FOREIGN KEY ("congregation_id") REFERENCES "public"."congregations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_details" ADD CONSTRAINT "receipt_details_header_id_receipt_header_id_fk" FOREIGN KEY ("header_id") REFERENCES "public"."receipt_header"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_details" ADD CONSTRAINT "receipt_details_contribution_type_id_ledger_accounts_id_fk" FOREIGN KEY ("contribution_type_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_details" ADD CONSTRAINT "receipt_details_bank_id_ledger_accounts_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_details" ADD CONSTRAINT "receipt_details_contributor_group_groups_id_fk" FOREIGN KEY ("contributor_group") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_details" ADD CONSTRAINT "receipt_details_contributor_district_districts_id_fk" FOREIGN KEY ("contributor_district") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_details" ADD CONSTRAINT "receipt_details_contributor_service_services_id_fk" FOREIGN KEY ("contributor_service") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_details" ADD CONSTRAINT "receipt_details_contributor_cong_congregations_id_fk" FOREIGN KEY ("contributor_cong") REFERENCES "public"."congregations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_details" ADD CONSTRAINT "receipt_details_subaccount_sub_accounts_id_fk" FOREIGN KEY ("subaccount") REFERENCES "public"."sub_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_header" ADD CONSTRAINT "receipt_header_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_header" ADD CONSTRAINT "receipt_header_congregation_id_congregations_id_fk" FOREIGN KEY ("congregation_id") REFERENCES "public"."congregations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_congregation_id_congregations_id_fk" FOREIGN KEY ("congregation_id") REFERENCES "public"."congregations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_accounts" ADD CONSTRAINT "sub_accounts_bank_id_ledger_accounts_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_accounts" ADD CONSTRAINT "sub_accounts_account_id_ledger_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_accounts" ADD CONSTRAINT "sub_accounts_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_accounts" ADD CONSTRAINT "sub_accounts_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "groups_congregation_id_idx" ON "groups" USING btree ("congregation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "groups_congregation_id_group_name_unique" ON "groups" USING btree ("congregation_id","group_name");--> statement-breakpoint
CREATE INDEX "receipt_details_header_id_idx" ON "receipt_details" USING btree ("header_id");--> statement-breakpoint
CREATE INDEX "receipt_details_contribution_type_id_idx" ON "receipt_details" USING btree ("contribution_type_id");--> statement-breakpoint
CREATE INDEX "receipt_details_bank_id_idx" ON "receipt_details" USING btree ("bank_id");--> statement-breakpoint
CREATE INDEX "receipt_details_contribution_date_idx" ON "receipt_details" USING btree ("contribution_date");--> statement-breakpoint
CREATE INDEX "receipt_header_posted_by_idx" ON "receipt_header" USING btree ("posted_by");--> statement-breakpoint
CREATE INDEX "receipt_header_congregation_id_idx" ON "receipt_header" USING btree ("congregation_id");--> statement-breakpoint
CREATE INDEX "receipt_header_receipt_no_idx" ON "receipt_header" USING btree ("receipt_no");--> statement-breakpoint
CREATE INDEX "services_congregation_id_idx" ON "services" USING btree ("congregation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "services_congregation_id_service_name_unique" ON "services" USING btree ("congregation_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "subaccounts_name_unique" ON "sub_accounts" USING btree ("name");