import { z } from 'zod';
import { telemetryEnvShape } from '@nebula-chat/otel';
import { REPLY_STREAM_RECORD_TTL_SECONDS } from '@nebula-chat/redis';

const PRIVATE_KEY_VARIABLE = /^OWN_KEY_PRIVATE_KEY_V(\d+)$/;

// One worker secret per key version, `OWN_KEY_PRIVATE_KEY_V<n>`; a PEM, with `\n` accepted for its line breaks.
const ownKeyPrivateKeys = (source: NodeJS.ProcessEnv): Map<number, string> =>
  new Map(
    Object.entries(source).flatMap(([name, value]) => {
      const version = PRIVATE_KEY_VARIABLE.exec(name)?.[1];
      return version && value ? [[Number(version), value.replaceAll('\\n', '\n')] as const] : [];
    }),
  );

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
    // The version new Own key ciphertext is written under; defaults to the highest version with a private key.
    OWN_KEY_CURRENT_VERSION: z.coerce.number().int().positive().optional(),
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
    // Web search (Tavily). A set key always wins; without one, searches go keyless only when allowed.
    TAVILY_API_KEY: z.string().min(1).optional(),
    // Tavily's keyless access is rate-limited: for local dev, never production.
    TAVILY_KEYLESS: z.stringbool().default(false),
    // Bounds a whole fetch or search.
    WEB_FETCH_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    WEB_FETCH_MAX_CHARS: z.coerce.number().int().positive().default(12_000),
    // The Purge's thresholds (ADR-0028): how long a Pending deletion lasts, how long a Guest may idle.
    PENDING_DELETION_DAYS: z.coerce.number().int().positive().default(30),
    GUEST_INACTIVE_DAYS: z.coerce.number().int().positive().default(30),
    // How long a Run waits for the answer to its Clarifying question before carrying on without it.
    CLARIFYING_QUESTION_TIMEOUT_MS: z.coerce.number().int().positive().default(180_000),
    // Tries of a Run job the worker enqueues itself (the resume after a timeout), as the server's.
    RUN_JOB_ATTEMPTS: z.coerce.number().int().positive().default(3),
    RUN_JOB_BACKOFF_MS: z.coerce.number().int().nonnegative().default(5_000),
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

const parsed = envSchema.parse(process.env);
const privateKeys = ownKeyPrivateKeys(process.env);
const currentVersion = parsed.OWN_KEY_CURRENT_VERSION ?? Math.max(0, ...privateKeys.keys());
// Fails boot rather than the first Own key that needs it; no private key at all leaves Own keys unusable.
if (privateKeys.size > 0 && !privateKeys.has(currentVersion)) {
  throw new Error(`OWN_KEY_PRIVATE_KEY_V${currentVersion} is not set`);
}

export const env: Env = parsed;

/** The Own key private keys by version, and the version new ciphertext is written under. */
export const ownKeyConfig = { privateKeys, currentVersion };
