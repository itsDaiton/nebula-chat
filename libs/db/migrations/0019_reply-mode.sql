ALTER TABLE "sessions" ADD COLUMN "reply_mode" text DEFAULT 'direct' NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_reply_mode_check" CHECK ("sessions"."reply_mode" in ('direct', 'run'));--> statement-breakpoint
UPDATE "sessions" SET "reply_mode" = 'run' WHERE EXISTS (SELECT 1 FROM "runs" WHERE "runs"."session_id" = "sessions"."id");
