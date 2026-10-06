import { z } from 'zod';
import { LOG_LEVELS } from '@nebula-chat/otel';
import { logLevelOverridesSchema } from '@backend/utils/logLevelOverrides';
import { operatorTokenSchema } from '@backend/utils/operatorToken';
import { checkSocialProviderPairs, oauthCredentialSchema } from '@backend/utils/socialProviders';

// CORS and better-auth match the browser's `Origin` header exactly, so keep only scheme://host:port.
const originSchema = z.url({ protocol: /^https?$/ }).transform((url) => new URL(url).origin);

// Resend takes a bare address or `Name <address>`; validate the address either way.
const emailFromSchema = z
  .string()
  .trim()
  .refine((raw) => z.email().safeParse(/<([^<>]+)>$/.exec(raw)?.[1] ?? raw).success, {
    message: 'Expected an email address or "Name <address>"',
  });

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
    LOG_LEVEL_OVERRIDES: logLevelOverridesSchema,
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    CLIENT_URL: originSchema.default('http://localhost:5173'),
    SERVER_URL: z.preprocess((raw) => (raw === '' ? undefined : raw), originSchema.optional()),
    TRUST_PROXY: z.string().optional(),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.url(),
    // Transactional email (verification + password reset) via Resend, ADR-0021.
    RESEND_API_KEY: z.string().min(1),
    EMAIL_FROM: emailFromSchema,
    GUEST_MESSAGE_ALLOWANCE: z.coerce.number().int().default(10),
    // How long SIGTERM/SIGINT waits for in-flight requests and the span flush
    // before exiting anyway. The default sits inside Render's 30s grace period;
    // `.env.example` drops it to 1s, since `tsx watch` waits on this exit before
    // every restart. Not keyed on NODE_ENV, which defaults to `development`.
    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(25_000),
    // Social sign-in OAuth apps; each provider is offered only when both its values are set.
    GOOGLE_CLIENT_ID: oauthCredentialSchema,
    GOOGLE_CLIENT_SECRET: oauthCredentialSchema,
    GITHUB_CLIENT_ID: oauthCredentialSchema,
    GITHUB_CLIENT_SECRET: oauthCredentialSchema,
    // Shared operator secret for /api/internal/*; unset turns those routes off.
    OPERATOR_TOKEN: operatorTokenSchema,
    OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
    OTEL_LOG_LEVEL: z
      .enum(['none', 'error', 'warn', 'info', 'debug', 'verbose', 'all'])
      .default('error'),
  })
  .refine((data) => data.OPENAI_API_KEY !== undefined || data.ANTHROPIC_API_KEY !== undefined, {
    message: 'At least one of OPENAI_API_KEY or ANTHROPIC_API_KEY must be set',
  })
  .check(checkSocialProviderPairs);

export const env = envSchema.parse(process.env);
