ALTER TABLE "users" RENAME COLUMN "user_type_id" TO "user_type";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login" timestamp;