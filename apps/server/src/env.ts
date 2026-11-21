import { z } from 'zod';
import { telemetryEnvShape } from '@nebula-chat/otel';
import { operatorTokenSchema } from '@server/utils/operatorToken';
import {
  checkProfileImageStorage,
  storageSettingSchema,
  supabaseUrlSchema,
} from '@server/utils/profileImageStorage';
import { checkSocialProviderPairs, oauthCredentialSchema } from '@server/utils/socialProviders';

// CORS and better-auth match the browser's `Origin` header exactly, so keep only scheme://host:port.
const originSchema = z.url({ protocol: /^https?$/ }).transform((url) => new URL(url).origin);

// Resend takes a bare address or `Name <address>`; validate the address either way.
const emailFromSchema = z
  .string()
  .trim()
  .refine((raw) => z.email().safeParse(/<([^<>]+)>$/.exec(raw)?.[1] ?? raw).success, {
    message: 'Expected an email address or "Name <address>"',
  });

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

const unsetWhenEmpty = (raw: unknown) => (raw === '' ? undefined : raw);

export const envSchema = z
  .object({
    // Unset is accepted only for local dev (checked below), so a deploy that forgets it fails boot.
    NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
    // Set by Render on every service; its presence marks a deployment.
    RENDER: z.string().optional(),
    ...telemetryEnvShape,
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    // The worker app's public URL: the server pings its /health on every enqueue to wake it (ADR-0013).
    WORKER_URL: originSchema.default('http://localhost:3001'),
    // How long a stop request waits for the worker to see it; it outlasts a cold start of a job that is still queued.
    STREAM_CANCEL_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60),
    // A Run job's tries and the base of its exponential backoff; a retry resumes the Run.
    RUN_JOB_ATTEMPTS: z.coerce.number().int().positive().default(3),
    RUN_JOB_BACKOFF_MS: z.coerce.number().int().nonnegative().default(5_000),
    CLIENT_URL: originSchema.default('http://localhost:5173'),
    SERVER_URL: z.preprocess((raw) => (raw === '' ? undefined : raw), originSchema.optional()),
    TRUST_PROXY: z.string().optional(),
    BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
    BETTER_AUTH_URL: z.url(),
    // Transactional email (verification + password reset) via Resend, ADR-0021.
    RESEND_API_KEY: z.string().min(1),
    EMAIL_FROM: emailFromSchema,
    GUEST_MESSAGE_ALLOWANCE: z.coerce
      .number()
      .int()
      .min(0, 'GUEST_MESSAGE_ALLOWANCE must not be negative')
      .default(10),
    // Swagger UI, /openapi.json and better-auth's reference page; unset = on outside production.
    API_DOCS_ENABLED: z.preprocess(unsetWhenEmpty, z.stringbool().optional()),
    // USD of Operator-key spend a verified Registered user may incur per UTC month.
    SPEND_ALLOWANCE_USD: z.coerce.number().nonnegative().default(1),
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
  })
  .check(checkSocialProviderPairs)
  .check(checkProfileImageStorage)
  .check((ctx) => {
    const { NODE_ENV, RENDER, BETTER_AUTH_URL } = ctx.value;
    const authUrl = URL.canParse(BETTER_AUTH_URL) ? new URL(BETTER_AUTH_URL) : undefined;
    if (NODE_ENV === 'production' && authUrl && authUrl.protocol !== 'https:') {
      ctx.issues.push({
        code: 'custom',
        message: 'BETTER_AUTH_URL must be https when NODE_ENV=production',
        input: ctx.value,
      });
    }
    const looksDeployed = Boolean(RENDER) || (authUrl && !LOCAL_HOSTNAMES.has(authUrl.hostname));
    if (!NODE_ENV && looksDeployed) {
      ctx.issues.push({
        code: 'custom',
        message:
          'NODE_ENV must be set in a deployment (RENDER is set or BETTER_AUTH_URL is not localhost)',
        input: ctx.value,
      });
    }
  })
  .transform((value) => {
    const nodeEnv = value.NODE_ENV ?? 'development';
    return {
      ...value,
      NODE_ENV: nodeEnv,
      API_DOCS_ENABLED: value.API_DOCS_ENABLED ?? nodeEnv !== 'production',
    };
  });

export const env = envSchema.parse(process.env);
