ALTER TABLE "audit_entries" DROP CONSTRAINT "audit_entries_action_check";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_active_at" timestamp;--> statement-breakpoint
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_action_check" CHECK ("audit_entries"."action" in ('admin.granted', 'user.role_changed', 'user.banned', 'user.unbanned', 'user.restored', 'session.read', 'run.read', 'users.purged'));--> statement-breakpoint
UPDATE "users" SET "last_active_at" = COALESCE((SELECT max("messages"."created_at") FROM "messages" INNER JOIN "sessions" ON "sessions"."id" = "messages"."session_id" WHERE "sessions"."user_id" = "users"."id" AND "messages"."role" = 'user'), "users"."created_at");
