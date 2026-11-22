CREATE TABLE "own_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"ciphertext" text NOT NULL,
	"key_version" integer NOT NULL,
	"last_four" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "own_keys_user_provider_unique" UNIQUE("user_id","provider"),
	CONSTRAINT "own_keys_provider_check" CHECK ("own_keys"."provider" in ('openai', 'anthropic')),
	CONSTRAINT "own_keys_status_check" CHECK ("own_keys"."status" in ('pending', 'valid', 'invalid'))
);
--> statement-breakpoint
ALTER TABLE "model_calls" ADD COLUMN "own_key" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "own_keys" ADD CONSTRAINT "own_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "own_keys_key_version_idx" ON "own_keys" USING btree ("key_version");