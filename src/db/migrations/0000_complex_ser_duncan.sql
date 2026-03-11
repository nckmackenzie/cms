CREATE TYPE "public"."user_type_enum" AS ENUM('super admin', 'admin', 'standard user');--> statement-breakpoint
CREATE TABLE "congregations" (
	"id" serial PRIMARY KEY NOT NULL,
	"parish_name" varchar(255),
	"congregation_name" varchar(255) NOT NULL,
	"contact" varchar(15),
	"email" varchar(255),
	"address" varchar(255),
	"about_us" varchar(255),
	"is_parish" boolean DEFAULT false,
	"prefix" varchar(50),
	"inauguration_date" date,
	"sactuary_type" varchar(15),
	"year_started" integer,
	"foundation_stone" date,
	"dedication_date" date,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" serial PRIMARY KEY NOT NULL,
	"district_name" varchar(255) NOT NULL,
	"deleted_at" timestamp,
	"congregation_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_name" varchar(100) NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(100) NOT NULL,
	"user_name" varchar(255) NOT NULL,
	"user_type_id" "user_type_enum" DEFAULT 'standard user' NOT NULL,
	"password" varchar(255) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"contact" varchar(15),
	"district_id" integer,
	"congregation_id" integer NOT NULL,
	"role_id" integer,
	"transfer_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_congregation_id_congregations_id_fk" FOREIGN KEY ("congregation_id") REFERENCES "public"."congregations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_congregation_id_congregations_id_fk" FOREIGN KEY ("congregation_id") REFERENCES "public"."congregations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "congregations_congregation_name_idx" ON "congregations" USING btree ("congregation_name");--> statement-breakpoint
CREATE INDEX "congregations_prefix_idx" ON "congregations" USING btree ("prefix");--> statement-breakpoint
CREATE INDEX "districts_congregation_id_idx" ON "districts" USING btree ("congregation_id");--> statement-breakpoint
CREATE INDEX "districts_district_name_idx" ON "districts" USING btree ("district_name");--> statement-breakpoint
CREATE UNIQUE INDEX "districts_congregation_id_district_name_unique" ON "districts" USING btree ("congregation_id","district_name");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_role_name_unique" ON "roles" USING btree ("role_name");--> statement-breakpoint
CREATE UNIQUE INDEX "users_user_id_unique" ON "users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_district_id_idx" ON "users" USING btree ("district_id");--> statement-breakpoint
CREATE INDEX "users_congregation_id_idx" ON "users" USING btree ("congregation_id");--> statement-breakpoint
CREATE INDEX "users_role_id_idx" ON "users" USING btree ("role_id");