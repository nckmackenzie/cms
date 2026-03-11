ALTER TABLE "users" ADD COLUMN "reset_token" varchar;--> statement-breakpoint
CREATE UNIQUE INDEX "users_reset_token_unique" ON "users" USING btree ("reset_token");