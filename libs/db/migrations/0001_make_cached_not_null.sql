UPDATE "messages" SET "cached" = false WHERE "cached" IS NULL;
--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "cached" SET NOT NULL;
