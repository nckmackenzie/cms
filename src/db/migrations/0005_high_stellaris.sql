ALTER TABLE "users" RENAME COLUMN "reset_token" TO "password_reset_code_hash";--> statement-breakpoint
DROP INDEX "users_reset_token_unique";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_code_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_code_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_locked_until" timestamp;