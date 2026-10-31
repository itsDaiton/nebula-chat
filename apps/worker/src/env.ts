import { z } from 'zod';
import { telemetryEnvShape } from '@nebula-chat/otel';
import { REPLY_STREAM_RECORD_TTL_SECONDS } from '@nebula-chat/redis';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    ...telemetryEnvShape,
    // Only `/health` listens here: Render's free plan runs the worker as a web service (ADR-0013).
    PORT: z.coerce.number().default(3001),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    // How many Direct replies one worker instance produces at once; the primary LLM throttle.
    WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
    // How many Runs one instance executes at once: each fans out to several model calls.
    RUN_CONCURRENCY: z.coerce.number().int().positive().default(3),
    RUN_TURN_CAP: z.coerce.number().int().positive().default(6),
    RUN_PARALLEL_DELEGATES: z.coerce.number().int().positive().default(4),
    RUN_TOKEN_BUDGET: z.coerce.number().int().positive().default(60_000),
    // The share of the Run budget past which the Orchestrator is made to hand off.
    RUN_HANDOFF_THRESHOLD: z.coerce.number().gt(0).max(1).default(0.85),
    RUN_DELEGATE_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
    RUN_DELEGATE_TOOL_CALL_CAP: z.coerce.number().int().positive().default(6),
    // Web search (Tavily); without a key the researcher's searches come back as not configured.
    TAVILY_API_KEY: z.string().min(1).optional(),
    WEB_FETCH_MAX_BYTES: z.coerce.number().int().positive().default(2_000_000),
    // Bounds a whole fetch, redirects and body included, and a search.
    WEB_FETCH_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    WEB_FETCH_MAX_REDIRECTS: z.coerce.number().int().nonnegative().default(5),
    WEB_FETCH_MAX_CHARS: z.coerce.number().int().positive().default(12_000),
    RUN_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(5 * 60_000),
    // How long a reply stream outlives its end for a dropped client to resume (ADR-0014); at most its
    // ended record, which tells an expired stream from a queued one.
    STREAM_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .max(REPLY_STREAM_RECORD_TTL_SECONDS)
      .default(60 * 60),
  })
  .refine((data) => data.OPENAI_API_KEY !== undefined || data.ANTHROPIC_API_KEY !== undefined, {
    message: 'At least one of OPENAI_API_KEY or ANTHROPIC_API_KEY must be set',
  });

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
