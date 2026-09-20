import { betterAuth } from 'better-auth'
import type { Auth, User as BetterAuthUser, Session as BetterAuthSession } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { anonymous, haveIBeenPwned } from 'better-auth/plugins'
import { users, session, account, verification } from '@nebula-chat/db'
import type { DbClient } from '@nebula-chat/db'
import type { AuthStore } from '@nebula-chat/redis'
import type { Logger } from '@nebula-chat/otel'
import { claimConversations } from './claim'
import { toBetterAuthLogHandler } from './logger'

/**
 * Everything the lib needs to build a configured better-auth instance. The lib
 * NEVER reads `process.env` — a published lib cannot bind to a consumer's env
 * schema (same rule `@nebula-chat/otel`/`@nebula-chat/redis` follow). The server
 * resolves these from its own env and passes them in.
 *
 * The Guest message allowance is deliberately NOT here: it is enforced in the
 * chat send pre-handler (ADR-0010 §4), not by better-auth.
 */
export interface CreateAuthConfig {
  /** The Drizzle client from `@nebula-chat/db` (better-auth owns the auth tables). */
  db: DbClient
  /**
   * The Redis-backed `authStore` from `@nebula-chat/redis`, adapted to
   * better-auth's `SecondaryStorage`. Sessions, verification records and
   * rate-limit counters live here (ADR-0010 §3).
   */
  authStore: AuthStore
  /**
   * Injected `@nebula-chat/otel` (Pino) logger. better-auth's internal logs are
   * routed through it (the lib's single sink); the lib never reaches for
   * `console` or a consumer's own logger.
   */
  logger: Logger
  /** `BETTER_AUTH_SECRET` — signs sessions and the session cookie cache. */
  secret: string
  /** `BETTER_AUTH_URL` — the app's base URL, used for cookies/redirects. */
  baseURL: string
  /** Origins allowed to call the auth endpoints (CSRF protection). */
  trustedOrigins?: string[]
}

/**
 * Build the configured better-auth instance for Nebula Chat.
 *
 * - Drizzle adapter over `@nebula-chat/db` (`provider: 'pg'`), with the schema
 *   passed so model names map to our tables; `user.modelName: 'users'` keeps the
 *   `user` model on the existing `users` table.
 * - `advanced.database.generateId: 'uuid'` so Postgres generates ids
 *   (`gen_random_uuid()`), leaving the `conversations.userId` uuid FK unchanged.
 * - `secondaryStorage` = the injected `authStore` (get/set/delete; ttl in seconds).
 * - `session.cookieCache` enabled so most requests validate from a signed cookie
 *   without touching Redis. `storeSessionInDatabase` is intentionally NOT set —
 *   sessions live in Redis (flip it on later in one line to move them to Postgres).
 * - `rateLimit` enabled with `storage: 'secondary-storage'` (counters in Redis).
 * - anonymous plugin with `onLinkAccount` claiming the Guest's conversations.
 * - Have I Been Pwned plugin rejecting breached passwords on sign-up.
 * - email/password enabled. No OAuth / email verification / reset in this slice.
 */
export const createAuth = ({
  db,
  authStore,
  logger,
  secret,
  baseURL,
  trustedOrigins
}: CreateAuthConfig): Auth =>
  // better-auth 1.7 made `Auth` generic (`Auth<Options>`) and invariant, so the
  // instance `betterAuth()` infers no longer widens to the base `Auth` we expose.
  // Cast back to the portable base type (see `AuthInstance`): safe because the
  // value IS an `Auth` — only the embedded options generic differs.
  betterAuth({
    secret,
    baseURL,
    trustedOrigins,
    // Route better-auth's internal logs through the injected Pino logger.
    logger: {
      log: toBetterAuthLogHandler(logger)
    },
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { users, session, account, verification }
    }),
    user: {
      modelName: 'users'
    },
    advanced: {
      database: {
        generateId: 'uuid'
      }
    },
    emailAndPassword: {
      enabled: true
    },
    // Adapt the Redis-backed authStore to better-auth's SecondaryStorage. As of
    // @better-auth/core 1.7 (src/db/type.ts) the interface is
    // get/getAndDelete/increment/set/delete; `ttl` is in seconds, which authStore
    // maps to `SET ... EX` (set) and `INCR` + create-only `EXPIRE` (increment, the
    // fixed-window semantics the secondary-storage rate limiter requires).
    secondaryStorage: {
      get: (key) => authStore.get(key),
      getAndDelete: (key) => authStore.getAndDelete(key),
      increment: (key, ttl) => authStore.increment(key, ttl),
      set: (key, value, ttl) => authStore.set(key, value, ttl),
      delete: (key) => authStore.delete(key)
    },
    session: {
      cookieCache: {
        enabled: true
      }
    },
    rateLimit: {
      enabled: true,
      storage: 'secondary-storage'
    },
    plugins: [
      anonymous({
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          // Claim the Guest's conversations into the linked account BEFORE the
          // anonymous row is cleaned up (ADR-0010 §2).
          await claimConversations(db, {
            fromUserId: anonymousUser.user.id,
            toUserId: newUser.user.id
          })
        }
      }),
      haveIBeenPwned()
    ]
  }) as unknown as Auth

/**
 * The configured better-auth instance type — what `createAuth` returns. Annotated
 * as the base `Auth` (rather than the inferred `Auth<typeof options>`) because the
 * plugin option types better-auth embeds in the inferred type are not exported
 * from a stable path, which makes the inferred type non-portable in `.d.ts` emit
 * (TS2883). The server's `requireUser`/`requireRegistered` decorators use the
 * `User`/`Session` aliases below, which we compose explicitly.
 */
export type AuthInstance = Auth

/**
 * The user record as seen by the server. The base better-auth `User` plus the
 * anonymous plugin's `isAnonymous` flag — the field `requireRegistered` reads to
 * tell a Guest from a Registered user.
 */
export type User = BetterAuthUser & {
  /** `true` for a Guest (anonymous plugin); falsy/absent for a Registered user. */
  isAnonymous?: boolean | null
}

/** The session record as seen by the server. */
export type Session = BetterAuthSession

/** `{ session, user }` — the shape `auth.api.getSession()` resolves to. */
export interface SessionData {
  session: Session
  user: User
}
