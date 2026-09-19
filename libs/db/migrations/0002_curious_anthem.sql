-- M-6: better-auth schema reshape.
-- better-auth becomes the source of truth for `users`/`session`/`account`/`verification`.
-- Ordering matters: (1) create new tables + nullable/defaulted columns, (2) backfill/relocate
-- data while the old columns still exist, (3) enforce NOT NULL, (4) drop the old columns.
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_anonymous" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Data migration (one-time). "name" and "password_hash"/"display_name"/"avatar_url" still exist
-- at this point in the file, so this must run before they are dropped/tightened below.

-- Backfill users.name from the old display_name, falling back to the email local-part.
UPDATE "users" SET "name" = COALESCE("display_name", split_part("email", '@', 1)) WHERE "name" IS NULL;--> statement-breakpoint

-- Backfill users.image from the old avatar_url.
UPDATE "users" SET "image" = "avatar_url" WHERE "image" IS NULL AND "avatar_url" IS NOT NULL;--> statement-breakpoint

-- Relocate each non-null password hash into a new `account` row for the credential provider.
-- account_id = user.id per better-auth's convention for the credential provider.
INSERT INTO "account" ("id", "account_id", "provider_id", "user_id", "password", "created_at", "updated_at")
SELECT gen_random_uuid(), "id"::text, 'credential', "id", "password_hash", now(), now()
FROM "users"
WHERE "password_hash" IS NOT NULL;--> statement-breakpoint

-- Clean stray ownerless conversations before conversations.user_id becomes NOT NULL.
-- Every conversation is expected to already have an owner; this is a no-op backfill guard,
-- not an expected-to-fire deletion.
DELETE FROM "conversations" WHERE "user_id" IS NULL;--> statement-breakpoint

-- NOTE: the next two statements each take an ACCESS EXCLUSIVE lock and (on Postgres < 12, and
-- on 12+ too since there is no pre-existing validated CHECK constraint to short-circuit the scan)
-- perform a full-table scan to validate the new NOT NULL constraint. Both tables are small today;
-- re-evaluate before running this against a large `conversations`/`users` table in production.
ALTER TABLE "conversations" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password_hash";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "display_name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "avatar_url";
