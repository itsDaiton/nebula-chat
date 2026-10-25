CREATE TABLE "model_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"user_id" uuid,
	"session_id" uuid,
	"run_id" uuid,
	"step_id" uuid,
	"agent" text,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"cached_input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"tokens_estimated" boolean DEFAULT false NOT NULL,
	"cost_usd" numeric(12, 6) NOT NULL,
	"duration_ms" integer NOT NULL,
	"outcome" text NOT NULL,
	"cached" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "model_calls_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "model_calls_outcome_check" CHECK ("model_calls"."outcome" in ('completed', 'failed', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "model_calls_created_model_idx" ON "model_calls" USING btree ("created_at","model");--> statement-breakpoint
CREATE INDEX "model_calls_user_idx" ON "model_calls" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "model_calls_session_idx" ON "model_calls" USING btree ("session_id");