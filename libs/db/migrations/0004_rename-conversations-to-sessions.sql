-- Renamed in place, never dropped and recreated, so every row survives.
-- better-auth's `session` table is a different table and stays as it is.
ALTER TABLE "conversations" RENAME TO "sessions";--> statement-breakpoint
ALTER TABLE "sessions" RENAME CONSTRAINT "conversations_pkey" TO "sessions_pkey";--> statement-breakpoint
ALTER TABLE "sessions" RENAME CONSTRAINT "conversations_user_id_users_id_fk" TO "sessions_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "title" SET DEFAULT 'New session';--> statement-breakpoint
ALTER INDEX "conv_user_idx" RENAME TO "session_user_idx";--> statement-breakpoint
ALTER TABLE "messages" RENAME COLUMN "conversation_id" TO "session_id";--> statement-breakpoint
ALTER TABLE "messages" RENAME CONSTRAINT "messages_conversation_id_conversations_id_fk" TO "messages_session_id_sessions_id_fk";--> statement-breakpoint
ALTER INDEX "msg_conv_idx" RENAME TO "msg_session_idx";
