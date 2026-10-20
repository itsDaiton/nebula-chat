import { z } from 'zod';
import { LOG_LEVELS } from '@nebula-chat/otel';
import { logLevelOverridesSchema } from '@backend/utils/logLevelOverrides';
import { operatorTokenSchema } from '@backend/utils/operatorToken';
import {
  checkProfileImageStorage,
  storageSettingSchema,
  supabaseUrlSchema,
} from '@backend/utils/profileImageStorage';
import { checkSocialProviderPairs, oauthCredentialSchema } from '@backend/utils/socialProviders';

// CORS and better-auth match the browser's `Origin` header exactly, so keep only scheme://host:port.
const originSchema = z.url({ protocol: /^https?$/ }).transform((url) => new URL(url).origin);

// The OTLP/HTTP exporters need a scheme; a bare `localhost:4318` parses as one called `localhost:`.
const otlpEndpointSchema = z.url({ protocol: /^https?$/ });

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
    // The worker app's public URL: the server pings its /health on every enqueue to wake it (ADR-0013).
    WORKER_URL: originSchema.default('http://localhost:3001'),
    CLIENT_URL: originSchema.default('http://localhost:5173'),
    SERVER_URL: z.preprocess((raw) => (raw === '' ? undefined : raw), originSchema.optional()),
    TRUST_PROXY: z.string().optional(),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.url(),
    // Transactional email (verification + password reset) via Resend, ADR-0021.
    RESEND_API_KEY: z.string().min(1),
    EMAIL_FROM: emailFromSchema,
    GUEST_MESSAGE_ALLOWANCE: z.coerce.number().int().default(10),
    // Social sign-in OAuth apps; each provider is offered only when both its values are set.
    GOOGLE_CLIENT_ID: oauthCredentialSchema,
    GOOGLE_CLIENT_SECRET: oauthCredentialSchema,
    GITHUB_CLIENT_ID: oauthCredentialSchema,
    GITHUB_CLIENT_SECRET: oauthCredentialSchema,
    // Shared operator secret for /api/internal/*; unset turns those routes off.
    OPERATOR_TOKEN: operatorTokenSchema,
    // Supabase Storage for Profile images (ADR-0022); all three or none, none turns uploads off.
    SUPABASE_URL: supabaseUrlSchema,
    SUPABASE_SECRET_KEY: storageSettingSchema,
    PROFILE_IMAGE_BUCKET: storageSettingSchema,
    OTEL_EXPORTER_OTLP_ENDPOINT: otlpEndpointSchema.optional(),
    // Log export over OTLP is opt-in (ADR-0023): `otlp` plus an endpoint, this one or the shared one.
    OTEL_LOGS_EXPORTER: z.enum(['otlp', 'none']).optional(),
    OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: otlpEndpointSchema.optional(),
    OTEL_LOG_LEVEL: z
      .enum(['none', 'error', 'warn', 'info', 'debug', 'verbose', 'all'])
      .default('error'),
  })
  .check(checkSocialProviderPairs)
  .check(checkProfileImageStorage);

export const env = envSchema.parse(process.env);
