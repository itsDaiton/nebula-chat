-- A Message is authored by `user` or `assistant` only. Nothing writes
-- `system` rows; drop any stray ones first so the constraint below always applies.
DELETE FROM "messages" WHERE "role" NOT IN ('user', 'assistant');--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_role_check" CHECK ("messages"."role" in ('user', 'assistant'));
