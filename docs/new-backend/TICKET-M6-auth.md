# M-6 — `@nebula-chat/auth` (better-auth substrate; replaces the hand-rolled JWT/argon2 stack)

> **Status:** Spec rewritten 2026-09-19 after a `/grill-with-docs` session. This supersedes the original
> hand-rolled `@fastify/jwt` + `argon2` + `@fastify/oauth2` spec, which was written before the app existed and
> never implemented OAuth. Treat the old ticket's code snippets as discarded. Backing decision:
> [ADR-0010](../adr/0010-better-auth-for-auth.md).

## Ticket metadata

| Field          | Value                                                                          |
| -------------- | ------------------------------------------------------------------------------ |
| **ID**         | M-6                                                                            |
| **Package**    | `libs/auth` → published as `@nebula-chat/auth`, plus `apps/server` wiring       |
| **Depends on** | M-1 (Fastify), M-2 (`@nebula-chat/db`), M-4 (`@nebula-chat/redis`) — all merged |
| **Blocks**     | Nothing (M-7/M-8 may extend the `authStore` primitive)                          |
| **Standalone** | No — requires M-1, M-2, M-4                                                     |

---

## Problem Statement

The app has no accounts. A conversation's `userId` is **nullable**, so everything is effectively anonymous and
there is no path to real users. The original M-6 ticket would have us hand-roll that path from primitives —
`@fastify/jwt` with access/refresh tokens, `argon2` hashing, a bespoke `authenticate` decorator, and
`@fastify/oauth2` that it listed but never wired — reprising the "build it ourselves" instinct that ADR-0009
already rejected for Redis.

We also want accounts **without** a signup wall in front of the first message: a chat app that demands
registration before a user can try it converts badly.

## Solution

Adopt **[better-auth](https://better-auth.com)** as the whole auth infrastructure, wrapped as a first-party lib
**`@nebula-chat/auth`**. The lib configures and exports a better-auth instance (Drizzle adapter over
`@nebula-chat/db`, the anonymous plugin, and `@nebula-chat/redis`-backed storage). The server mounts it on a
catch-all `/api/auth/*` route and gates protected routes with a decorator over `auth.api.getSession()`.

better-auth owns password hashing and session management, so the JWT/argon2/refresh design is dropped entirely.
Anonymous access is **metered**: a Guest gets a bounded **message allowance**, and their conversations are
**claimed** into a real account when they register or sign in.

## User Stories

1. As a **new visitor**, I want to start chatting immediately as a Guest, so that I can try the app without signing up.
2. As a **Guest**, I want a bounded number of messages (the **message allowance**) before I'm asked to register, so that the product is try-before-you-buy rather than a paywall.
3. As a **Guest who registers**, I want my existing conversations **claimed** into my new account, so that signing up upgrades my history instead of wiping it.
4. As a **returning user**, I want to sign in with email + password and see my conversations, so that my history follows my account.
5. As a **backend developer**, I want one `@nebula-chat/auth` lib exporting a configured better-auth instance, so that the server wires auth without assembling primitives by hand.
6. As a **backend developer**, I want a `requireUser` / `requireRegistered` decorator, so that I can protect routes and distinguish Guests from Registered users.
7. As a **backend developer**, I want auth's sessions/verification/rate-limit state in Redis via `@nebula-chat/redis`, so that session churn stays off Postgres and the substrate's reserved seams get their first consumer.
8. As an **operator**, I want durable identity (`user`/`account`) in Postgres and only disposable state in Redis, so that a Redis outage costs live sessions, not accounts.
9. As a **maintainer**, I want `@nebula-chat/auth` registered in `release-please-config.json` with its own component, so that it versions and releases like the other libs.
10. As a **future feature developer**, I want social OAuth to slot in as config on the same better-auth instance, so that adding Google/GitHub later is additive.

## Implementation Decisions

### Package & tooling

- New package `libs/auth`, name `@nebula-chat/auth`, published to the GitHub registry with `access:
  restricted`, matching the other libs.
- Build with **`tsup`**, use the `catalog:` protocol for shared dev deps, mirroring `libs/otel` / `libs/redis`.
- Runtime deps: **`better-auth`**, `@nebula-chat/db` (`workspace:*`), `@nebula-chat/redis` (`workspace:*`), and
  `@nebula-chat/otel` (`workspace:*`) for logging.
- New-lib plumbing (required, in this order): add `.gitignore` (`dist/`, `node_modules/`); add a `libs/auth`
  entry to `release-please-config.json` with `component: nebula-chat-auth` and `include-component-in-tag:
  true`; then commit + push. (See the new-lib checklist in AGENTS.md.)

### Schema ownership (see ADR-0010 §1) — drizzle-migration-engineer owns this

- better-auth owns `user`/`session`/`account`/`verification`. Keep the table named **`users`** via
  `user.modelName: "users"`; map fields as needed (`name`, `image`, `emailVerified`).
- **Ids stay UUID**: set `advanced.database.generateId: "uuid"` so Postgres generates the UUID. This keeps the
  existing `conversations.userId` uuid FK unchanged — no FK/index churn.
- Password moves out of the `users` row into the **`account`** table (`credential` provider). A **one-time data
  migration** relocates existing `users.passwordHash` into `account` and drops the column.
- Workflow: `npx @better-auth/cli generate` emits the Drizzle schema into `libs/db`, then the repo's normal
  `pnpm --filter @nebula-chat/db db:generate` + migrate. There is **no** better-auth migrate step for Drizzle.
- **`conversations.userId` becomes `NOT NULL`** (every conversation has an owner). Backfill/clean any stray
  null rows in the migration.

### Anonymous access & the message allowance (see ADR-0010 §2, §4)

- Enable better-auth's **anonymous plugin**. `signIn.anonymous()` mints a Guest user + session on first use.
- Configure **`onLinkAccount`** to **claim** the Guest's conversations: reassign their `conversations.userId`
  to the newly linked account before the anonymous user is cleaned up (default deletion is fine).
- The **message allowance** is *our* logic, not better-auth's rate limiter:
  - Enforced in a **chat send pre-handler** in the chat module.
  - If the session user is a **Guest** and their `role='user'` message count **≥ cap**, reject the send with a
    machine-readable "registration required" response the client renders as a login wall.
  - **Count live from Postgres** — `count(messages)` joined to the Guest's conversations where `role='user'`.
    No Redis counter (exact, stateless, trivial at a cap of ~10).
  - Cap is **env-configured**, default **10**. Regenerations and assistant messages do **not** count.
  - Registered users are **uncapped**.

### Storage: sessions in Redis via `@nebula-chat/redis` (see ADR-0010 §3)

- Add an **`authStore`** primitive to `@nebula-chat/redis` (final name TBD at implementation) implementing
  better-auth's `SecondaryStorage` interface: `get`, `set`, `getAndDelete`, `increment`, `delete`, over the
  shared ioredis toolkit. It is the first consumer of the substrate's reserved storage seam.
- Wire it as better-auth's `secondaryStorage` → **sessions, verification records, and rate-limit counters live
  in Redis**.
- Enable **`session.cookieCache`** (signed short-lived cookie) so most requests validate without touching any
  store and short Redis blips are buffered.
- Do **not** set `storeSessionInDatabase` — sessions live in Redis for now. (Flipping it on later moves
  sessions back to Postgres in one line when horizontal scaling argues for it.)
- Enable better-auth's rate limiting with `rateLimit.storage: "secondary-storage"`.

### Server wiring (the MVP / first-PR slice)

The first PR is exactly this slice — no OAuth, no speculative capability:

1. Add `libs/auth` exporting the configured better-auth instance (Drizzle adapter, anonymous plugin,
   `authStore` secondaryStorage, cookieCache, rate limiting).
2. Add the `authStore` primitive to `@nebula-chat/redis`.
3. Add a Fastify **`auth.plugin.ts`** that mounts the catch-all `GET|POST /api/auth/*` route calling
   `auth.handler()`, and decorates the app with **`requireUser`** and **`requireRegistered`** (over
   `auth.api.getSession()` via `fromNodeHeaders`).
4. Add the **message-allowance pre-handler** to the chat send path.
5. Generate + migrate the schema changes (drizzle-migration-engineer): reshape `users`, add
   `session`/`account`/`verification`, `conversations.userId` → NOT NULL, relocate password hashes.
6. Add env vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GUEST_MESSAGE_ALLOWANCE` (default 10). Remove the
   old `JWT_SECRET` / `JWT_REFRESH_SECRET` design from `env.ts` (it is discarded).

## Testing Decisions

Consistent with **ADR-0008** (unit tests only, no testcontainers/supertest), and carrying the M-9 **80%
coverage gate**. Assert external behavior, never better-auth internals:

1. **Message allowance (integration, chat route) — primary.** Extend the chat route test
   (`app.inject()` against `buildApp()` with the repository layer mocked):
   - Guest under the cap → send succeeds;
   - Guest at the cap → send rejected with the "registration required" response;
   - regenerate at the cap → still allowed (doesn't count);
   - Registered user → uncapped.
2. **`authStore` primitive (unit, `libs/redis`).** Against a mocked ioredis: `get`/`set`/`getAndDelete`/
   `increment`/`delete`, namespace prefixing, TTL passthrough.
3. **Claim (unit/integration).** `onLinkAccount` reassigns the Guest's conversations to the linked account.

Do **not** unit-test better-auth's own session/hashing/verification — that's the library's responsibility.

## Out of Scope

- **Social OAuth (Google/GitHub)** — deferred to its own ticket; it's config on the same instance.
- **CSRF/helmet hardening** beyond better-auth's defaults — a later security-auditor pass (`@fastify/helmet`
  can land separately).
- **Sessions in Postgres** — reversible via `storeSessionInDatabase` when scaling requires it; not now.
- **A Redis counter for the allowance** — live Postgres count is used instead.
- **Roles/permissions / organizations** — future tickets if needed.

## Further Notes

- Backing decision recorded in [ADR-0010](../adr/0010-better-auth-for-auth.md): better-auth over hand-rolled
  auth, better-auth owning the schema (UUID/Postgres-gen), metered-anonymous via its plugin, and sessions in
  Redis (the load-bearing trade-off).
- Domain vocabulary added to `CONTEXT.md`: **Guest**, **Registered user**, **Message allowance**, **Claim**;
  **User** revised (owner is non-null). `session`/`account`/`verification` stay out of the glossary as
  infrastructure.
- Deployment reality that informed "sessions in Redis is acceptable now": the server runs as a **single**
  Render web instance, so the cross-instance session-churn argument is not yet in play — but the cookie cache
  and the one-line `storeSessionInDatabase` escape hatch keep the door open.
