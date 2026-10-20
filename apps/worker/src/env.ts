import { z } from 'zod';
import { LOG_LEVELS } from '@nebula-chat/otel';
import { logLevelOverridesSchema } from '@worker/logLevelOverrides';

// The OTLP/HTTP exporters need a scheme; a bare `localhost:4318` parses as one called `localhost:`.
const otlpEndpointSchema = z.url({ protocol: /^https?$/ });

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
    LOG_LEVEL_OVERRIDES: logLevelOverridesSchema,
    // Only `/health` listens here: Render's free plan runs the worker as a web service (ADR-0013).
    PORT: z.coerce.number().default(3001),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    // How many Direct replies one worker instance produces at once; the primary LLM throttle.
    WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
    OTEL_EXPORTER_OTLP_ENDPOINT: otlpEndpointSchema.optional(),
    OTEL_LOGS_EXPORTER: z.enum(['otlp', 'none']).optional(),
    OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: otlpEndpointSchema.optional(),
    OTEL_LOG_LEVEL: z
      .enum(['none', 'error', 'warn', 'info', 'debug', 'verbose', 'all'])
      .default('error'),
  })
  .refine((data) => data.OPENAI_API_KEY !== undefined || data.ANTHROPIC_API_KEY !== undefined, {
    message: 'At least one of OPENAI_API_KEY or ANTHROPIC_API_KEY must be set',
  });

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
