ALTER TABLE "model_calls" ADD COLUMN "message_id" uuid;--> statement-breakpoint
ALTER TABLE "model_calls" ADD COLUMN "context_messages" integer;--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "model_calls_message_idx" ON "model_calls" USING btree ("message_id");