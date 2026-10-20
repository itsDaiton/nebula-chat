import { z } from 'zod';
import { LOG_LEVELS } from '@nebula-chat/otel';
import type { LogLevel } from '@nebula-chat/otel';

// The OTLP/HTTP exporters need a scheme; a bare `localhost:4318` parses as one called `localhost:`.
const otlpEndpointSchema = z.url({ protocol: /^https?$/ });

// An override may also mute a component outright.
const OVERRIDE_LEVELS: readonly string[] = [...LOG_LEVELS, 'silent'];

// Spelled out rather than `LevelOverrides`, whose Pino level type this package cannot name.
type OverrideLevel = LogLevel | 'silent';

const isOverrideLevel = (value: string): value is OverrideLevel => OVERRIDE_LEVELS.includes(value);

/** `LOG_LEVEL_OVERRIDES`: comma-separated `component=level` pairs, as in the server (docs/logging.md). */
const logLevelOverridesSchema = z
  .string()
  .optional()
  .transform((raw, ctx): Record<string, OverrideLevel> => {
    const overrides: Record<string, OverrideLevel> = {};
    for (const entry of (raw ?? '').split(',')) {
      if (entry.trim() === '') continue;
      const parts = entry.split('=').map((part) => part.trim());
      const [component = '', level = ''] = parts;
      if (parts.length !== 2 || component === '' || !isOverrideLevel(level)) {
        ctx.addIssue({
          code: 'custom',
          message: `Invalid LOG_LEVEL_OVERRIDES entry "${entry.trim()}": expected component=level with level one of ${OVERRIDE_LEVELS.join(', ')}`,
        });
        return z.NEVER;
      }
      overrides[component] = level;
    }
    return overrides;
  });

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
