import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    REDIS_PASSWORD: z.string().optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    CLIENT_URL: z.string().default('http://localhost:5173'),
    SERVER_URL: z.string().optional(),
    TRUST_PROXY: z.string().optional(),
    // better-auth (M-6). The secret signs sessions + the cookie cache; the URL is
    // the app's public base URL for cookies/redirects. There is no JWT_SECRET /
    // JWT_REFRESH_SECRET — the hand-rolled JWT design was discarded (ADR-0010).
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.url(),
    // The Guest message allowance (ADR-0010 §4): a Guest may author this many
    // `user` messages before registration is required. Registered users are
    // uncapped. Counted live from Postgres in the chat send pre-handler.
    GUEST_MESSAGE_ALLOWANCE: z.coerce.number().int().default(10),
    // Documented and validated here for the app; @nebula-chat/otel reads both
    // from process.env directly, so these declarations do not gate the lib's
    // reads of them — see ADR-0007.
    OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
    OTEL_LOG_LEVEL: z
      .enum(['none', 'error', 'warn', 'info', 'debug', 'verbose', 'all'])
      .default('error'),
  })
  .refine((data) => data.OPENAI_API_KEY !== undefined || data.ANTHROPIC_API_KEY !== undefined, {
    message: 'At least one of OPENAI_API_KEY or ANTHROPIC_API_KEY must be set',
  });

export const env = envSchema.parse(process.env);
