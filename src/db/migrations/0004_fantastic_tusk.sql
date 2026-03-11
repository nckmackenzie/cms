DROP INDEX "users_user_id_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "users_user_id_congregation_unique" ON "users" USING btree ("user_id","congregation_id");