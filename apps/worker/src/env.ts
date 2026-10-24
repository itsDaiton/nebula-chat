import { z } from 'zod';
import { telemetryEnvShape } from '@nebula-chat/otel';

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
    // How long a reply stream outlives its terminal event, for a client that dropped mid-reply to
    // resume from; after that the client reads the persisted Message instead (ADR-0014).
    STREAM_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60 * 60),
  })
  .refine((data) => data.OPENAI_API_KEY !== undefined || data.ANTHROPIC_API_KEY !== undefined, {
    message: 'At least one of OPENAI_API_KEY or ANTHROPIC_API_KEY must be set',
  });

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
