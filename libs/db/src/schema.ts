import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  index,
  check,
  numeric,
} from 'drizzle-orm/pg-core';

// better-auth owns this table's shape (modelName `users`), so field names match its core user model exactly.
// `isAnonymous` comes from the anonymous plugin; `profileImageKey` is a server-only field (ADR-0022).
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  profileImageKey: text('profile_image_key'),
  isAnonymous: boolean('is_anonymous').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// better-auth core table — one session per active login (or anonymous Guest identity).
export const session = pgTable('session', {
  id: uuid('id').primaryKey().defaultRandom(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

// better-auth core table — one row per linked credential/OAuth provider for a user.
// `password` holds the credential-provider password hash (relocated out of `users`).
export const account = pgTable('account', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// better-auth core table — email verification tokens / password reset tokens / OTPs.
export const verification = pgTable('verification', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// The domain Session (CONTEXT.md), not better-auth's `session` table above.
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default('New session'),
    model: text('model').notNull().default('gpt-4o-mini'),
    systemPrompt: text('system_prompt'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('session_user_idx').on(t.userId)],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .references(() => sessions.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    content: text('content').notNull(),
    tokenCount: integer('token_count'),
    cached: boolean('cached').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('msg_session_idx').on(t.sessionId),
    check('messages_role_check', sql`${t.role} in ('user', 'assistant')`),
  ],
);

export const MODEL_CALL_OUTCOMES = ['completed', 'failed', 'cancelled'] as const;

export type ModelCallOutcome = (typeof MODEL_CALL_OUTCOMES)[number];

// Append-only (ADR-0030). References are nullable and set null on delete, so a Purge keeps the row
// without anything that identifies the User. `run_id` and `step_id` have no foreign key until Runs land.
export const modelCalls = pgTable(
  'model_calls',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // One call is recorded once: a Direct reply's stream id, a Step's id.
    idempotencyKey: text('idempotency_key').notNull().unique(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    runId: uuid('run_id'),
    stepId: uuid('step_id'),
    agent: text('agent'),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    // Input tokens billed at the full rate; the cached ones are counted apart.
    inputTokens: integer('input_tokens').notNull().default(0),
    cachedInputTokens: integer('cached_input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    // Counts come from our own tokenizer because the provider reported none.
    tokensEstimated: boolean('tokens_estimated').notNull().default(false),
    // USD at the catalog price when the call was recorded; a later price change leaves it alone.
    costUsd: numeric('cost_usd', { precision: 12, scale: 6, mode: 'number' }).notNull(),
    durationMs: integer('duration_ms').notNull(),
    outcome: text('outcome', { enum: MODEL_CALL_OUTCOMES }).notNull(),
    // Replayed from the response cache: no provider call, no cost.
    cached: boolean('cached').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('model_calls_created_model_idx').on(t.createdAt, t.model),
    index('model_calls_user_idx').on(t.userId),
    index('model_calls_session_idx').on(t.sessionId),
    check('model_calls_outcome_check', sql`${t.outcome} in ('completed', 'failed', 'cancelled')`),
  ],
);
