import 'dotenv/config';
import { z } from 'zod';
import { LOG_LEVELS, logLevelOverridesSchema } from '@backend/utils/logLevelOverrides';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
    LOG_LEVEL_OVERRIDES: logLevelOverridesSchema,
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    REDIS_PASSWORD: z.string().optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    CLIENT_URL: z.string().default('http://localhost:5173'),
    SERVER_URL: z.string().optional(),
    TRUST_PROXY: z.string().optional(),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.url(),
    GUEST_MESSAGE_ALLOWANCE: z.coerce.number().int().default(10),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
    OTEL_LOG_LEVEL: z
      .enum(['none', 'error', 'warn', 'info', 'debug', 'verbose', 'all'])
      .default('error'),
  })
  .refine((data) => data.OPENAI_API_KEY !== undefined || data.ANTHROPIC_API_KEY !== undefined, {
    message: 'At least one of OPENAI_API_KEY or ANTHROPIC_API_KEY must be set',
  });

export const env = envSchema.parse(process.env);
