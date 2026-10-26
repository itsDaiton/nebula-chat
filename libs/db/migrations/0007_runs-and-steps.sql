CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"brief" jsonb,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"token_budget" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	CONSTRAINT "runs_status_check" CHECK ("runs"."status" in ('queued', 'running', 'completed', 'partial', 'failed', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "steps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"turn" integer DEFAULT 0 NOT NULL,
	"phase" text NOT NULL,
	"name" text NOT NULL,
	"parent_step_id" uuid,
	"attempt" integer DEFAULT 1 NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"tokens" integer,
	"status" text DEFAULT 'running' NOT NULL,
	"error" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	CONSTRAINT "steps_phase_check" CHECK ("steps"."phase" in ('intake', 'orchestrator', 'delegate', 'tool', 'output')),
	CONSTRAINT "steps_status_check" CHECK ("steps"."status" in ('running', 'completed', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "run_id" uuid;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_parent_step_id_steps_id_fk" FOREIGN KEY ("parent_step_id") REFERENCES "public"."steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "runs_session_idx" ON "runs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "runs_user_idx" ON "runs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "steps_run_idx" ON "steps" USING btree ("run_id");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."steps"("id") ON DELETE set null ON UPDATE no action;