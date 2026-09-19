# ADR-0010: Adopt better-auth as the authentication substrate, owning the auth schema, with metered-anonymous access and sessions in Redis

- **Status:** Accepted — to be implemented on `feat/m-6-better-auth`
- **Date:** 2026-09-19
- **Deciders:** @itsDaiton

## Context

Migration ticket M-6 originally specified a hand-rolled auth stack: `@fastify/jwt` with access/refresh
tokens, `argon2` password hashing, an `authenticate` decorator, and `@fastify/oauth2` listed in the
dependencies but never actually implemented. That spec predates the current app and mirrors the "build the
primitives ourselves" instinct that ADR-0009 walked back for Redis.

The product also has a gap the old ticket never addressed: today a conversation's `userId` is **nullable**,
so the app is effectively anonymous-only with no path to real accounts. We want accounts, but we do not want a
signup wall in front of the first message — a conversion killer for a chat app.

A `/grill-with-docs` session resolved both. The developer chose **better-auth** (a framework-agnostic
TypeScript auth library) as the whole auth infrastructure, wrapped as a first-party lib. Grilling against the
better-auth docs then settled four sub-decisions that are hard to reverse, surprising without context, and the
result of real trade-offs — recorded here. Full spec: `docs/new-backend/TICKET-M6-auth.md`.

## Decision

Adopt **better-auth**, wrapped as **`@nebula-chat/auth`**: the lib exports a configured better-auth instance
(Drizzle adapter over `@nebula-chat/db`, anonymous plugin, `@nebula-chat/redis`-backed storage); the server
mounts it via a catch-all `/api/auth/*` route calling `auth.handler()` and gates routes with a decorator over
`auth.api.getSession()`. The stale JWT/argon2/refresh design is discarded — better-auth owns password hashing
and session management itself.

Four sub-decisions clear the "hard to reverse + surprising + real trade-off" bar.

### 1. better-auth owns the auth schema; existing `users` is migrated into its shape

better-auth is the source of truth for `user`/`session`/`account`/`verification`. We keep the table named
`users` via `modelName`, but the shape changes: the password moves out of the `users` row into the `account`
table, `emailVerified` is added, and three new tables appear. Ids stay **UUID** — better-auth's
`advanced.database.generateId: "uuid"` lets **Postgres generate the UUID**, so the existing
`conversations.userId` uuid foreign key is unchanged and no FK/index churn is needed. The CLI workflow is
`better-auth generate` → the repo's normal `drizzle-kit` generate/migrate (better-auth has no migrate step for
Drizzle). A one-time data migration relocates existing users' password hashes into `account`.

The alternative — remapping better-auth onto the existing table shape via field mapping and hosting the
password on `users` — was rejected: it fights the adapter permanently, and every plugin that extends the
schema reopens the fight.

### 2. Metered-anonymous access via the anonymous plugin, with a claim on sign-up

`conversations.userId` becomes **NOT NULL**; "null means anonymous" is retired. Instead, better-auth's
**anonymous plugin** mints a real Guest user + session on first use, so every conversation always has an
owner. A Guest is held to a **message allowance** (an env-configured default of 10 `user`-authored messages,
counted live from Postgres in a chat send pre-handler — see sub-decision 4). When the Guest registers or logs
in, the plugin's `onLinkAccount` hook **claims** their conversations (reassigns `userId`) into the real
account before the anonymous row is cleaned up, and the allowance no longer applies.

The trade-off accepted: cookie-clearing resets a Guest's allowance, because the Guest identity is a session
cookie. That is acceptable for a conversion gate (not a paywall). The abuse backstops are better-auth's own IP
rate-limiting plus a **captcha** on the anonymous/sign-up path (provider TBD — may land in the first slice or a
fast-follow).

### 3. Sessions live in Redis via `@nebula-chat/redis` (the `authStore` primitive)

`@nebula-chat/redis` gains a real primitive — provisionally **`authStore`** — implementing better-auth's
`SecondaryStorage` interface (`get`/`set`/`delete`/`getAndDelete`/`increment`) over the shared ioredis
toolkit. With it configured, better-auth stores **sessions, verification records, and rate-limit counters in
Redis** rather than Postgres. `session.cookieCache` is enabled so most requests validate the session from a
signed short-lived cookie without touching any store.

This is the load-bearing trade-off: **Redis becomes required for login**, unlike the M-4 chat cache, which is
fail-open. We accept it because it makes better-auth the first real consumer of the M-4 substrate (its
reserved `rateLimit`/session seams), keeps session churn off Postgres, and the cookie cache buffers short
Redis blips. Durable **identity** (`user`/`account`) still lives in Postgres, so a Redis outage costs live
sessions, not accounts. If horizontal scaling later argues the other way, `session.storeSessionInDatabase:
true` moves sessions back to Postgres in one line.

### 4. First slice is email/password + anonymous + claim; OAuth and the counter store are scoped tightly

The first shippable slice is **email/password auth (with the Have I Been Pwned plugin rejecting breached
passwords), the anonymous plugin, and the claim** — social OAuth (Google/GitHub, near-trivial config in
better-auth) is deferred to its own ticket rather than shipped half-built like the old ticket's
`@fastify/oauth2`. **Email verification and password reset are deliberately *not* in the first slice**: they
require a transactional email provider (Resend/SMTP), so they are M-6's named immediate follow-up rather than a
silent omission. The message-allowance counter is a **live Postgres
`count`** of the Guest's `role='user'` messages, not a Redis counter: at a cap of ~10 the count is trivial,
exact, needs no seeding, and adds no second source of truth. Redis is reserved for better-auth's own
disposable state (sub-decision 3), not the allowance.

## Consequences

- `@nebula-chat/db` gains `session`/`account`/`verification` and a reshaped `users`; `conversations.userId`
  becomes NOT NULL. Owned by the drizzle-migration-engineer; a one-time data migration is required.
- **Redis is now required for login.** Auth (unlike the chat cache) is not fail-open; Redis availability is a
  hard dependency for authenticated requests, buffered only by the cookie-cache window.
- `@nebula-chat/redis` grows an `authStore` primitive (final name TBD at implementation) — the first consumer
  of its reserved storage seams.
- The domain gains **Guest**, **Registered user**, **Message allowance**, and **Claim** (see `CONTEXT.md`);
  `session`/`account`/`verification` stay out of the glossary as better-auth infrastructure.
- We depend on better-auth's release cadence and its schema-generation CLI coexisting with `drizzle-kit`.
- OAuth is a known, deferred follow-up, not missing scope.
- **Email verification / password reset are not in the first slice** and require an email-provider decision;
  they are the immediate M-6 follow-up.
- Further better-auth capabilities worth evaluating after M-6 (passwordless, passkey, 2FA, the OpenAPI plugin ↔
  Orval integration, JWT/Bearer for SSE/WS/workers, payments/tiered-allowance, API keys) are catalogued in
  issue #318 rather than scoped here.

## Alternatives considered

- **Hand-rolled `@fastify/jwt` + argon2 (the original M-6).** Rejected: reimplements sessions, hashing,
  verification, OAuth, and anonymous linking that better-auth ships and maintains.
- **Remap better-auth onto the existing `users` shape.** Rejected: permanent friction against the adapter,
  reopened by every schema-extending plugin.
- **Keep anonymous conversations as `userId = null`.** Rejected: gives no identity to hang the allowance or
  claim on; the anonymous plugin's real Guest row is cleaner.
- **Sessions in Postgres (all-Postgres auth state).** Rejected for now in favour of exercising the M-4
  substrate; explicitly reversible via `storeSessionInDatabase` when scaling changes the calculus.
- **A Redis counter for the message allowance.** Rejected: premature at a cap of ~10; a live Postgres count is
  exact and stateless.
