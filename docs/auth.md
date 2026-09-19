# Authentication

How authentication actually works in Nebula Chat. For the decisions behind this
shape — better-auth over a hand-rolled stack, metered-anonymous access, and
sessions in Redis — see [ADR-0010](./adr/0010-better-auth-for-auth.md). The full
spec is [`docs/new-backend/TICKET-M6-auth.md`](./new-backend/TICKET-M6-auth.md).

## The short version

Auth is [better-auth](https://better-auth.com), wrapped as the first-party lib
[`@nebula-chat/auth`](../libs/auth). The lib exports a **configured instance**; it
never reads `process.env`. The server builds that instance once, mounts it on a
catch-all `/api/auth/*` route, and gates protected routes with two preHandlers:
`requireUser` and `requireRegistered`.

There is no signup wall. A first-time visitor becomes a **Guest** (a real
anonymous user + session), chats up to a bounded **message allowance**, and has
their conversations **claimed** into a real account when they register or sign in.

See [CONTEXT.md](../CONTEXT.md) for the domain terms — **User**, **Guest**,
**Registered user**, **Message allowance**, **Claim**.

## Where the instance comes from

The lib's `createAuth()` takes everything it needs as injected config — no env
reads, matching the rule `@nebula-chat/otel` and `@nebula-chat/redis` follow:

```ts
// libs/auth — the public surface
export const auth = createAuth({
  db, // @nebula-chat/db client (Drizzle adapter)
  authStore, // @nebula-chat/redis SecondaryStorage (sessions/verification/rate-limit)
  logger, // @nebula-chat/otel Pino logger — better-auth's log sink
  secret, // BETTER_AUTH_SECRET
  baseURL, // BETTER_AUTH_URL
  trustedOrigins,
});
```

The server constructs the **one** instance in
[`apps/nebula-chat-server/src/auth.ts`](../apps/nebula-chat-server/src/auth.ts),
injecting its resolved `env`, the shared `db` client, `redis.authStore`, and the
shared Pino `logger`. Consumers import `auth` from `@backend/auth` rather than
building their own — same singleton pattern as `src/db.ts` and `src/redis.ts`.

## What the lib configures

All of this lives in `@nebula-chat/auth` (`libs/auth/src/auth.ts`), so the server
never assembles auth primitives by hand:

| Piece                        | What it does                                                                                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Drizzle adapter**          | Persists durable identity to Postgres via `@nebula-chat/db`. `advanced.database.generateId: 'uuid'` so **Postgres** generates ids, keeping `conversations.userId` a plain uuid FK. |
| **Anonymous plugin**         | `signIn.anonymous()` mints a Guest user + session. Its `onLinkAccount` hook runs the claim (below).                                                                                |
| **Have I Been Pwned plugin** | Rejects registration with a known-breached password.                                                                                                                               |
| **`secondaryStorage`**       | The `@nebula-chat/redis` `authStore` — **sessions, verification records, and rate-limit counters live in Redis**, not Postgres.                                                    |
| **`session.cookieCache`**    | A short-lived signed cookie so most requests validate without touching any store.                                                                                                  |
| **`rateLimit`**              | Enabled, with `storage: 'secondary-storage'` (Redis).                                                                                                                              |
| **email/password**           | Enabled. No OAuth, no email verification / password reset in this slice — see [Not here yet](#not-here-yet).                                                                       |

**Redis is required for login.** Unlike the chat cache (fail-open, ADR-0009), the
`authStore` lets Redis errors propagate: durable identity stays in Postgres, but
live sessions depend on Redis, buffered only by the cookie-cache window.

## Storage: what lives where

| Data                                                   | Store               | Why                                                  |
| ------------------------------------------------------ | ------------------- | ---------------------------------------------------- |
| `users`, `account` (durable identity, password hashes) | Postgres            | A Redis outage must cost live sessions, not accounts |
| `session`, `verification`, rate-limit counters         | Redis (`authStore`) | Disposable, high-churn — kept off Postgres           |

Sessions are **not** in Postgres today (`storeSessionInDatabase` is unset).
Flipping that one flag moves them back when horizontal scaling argues for it.
The password lives on the `account` row (`credential` provider), not on `users`.

## The route gates

[`plugins/auth.plugin.ts`](../apps/nebula-chat-server/src/plugins/auth.plugin.ts)
mounts better-auth and exposes two preHandlers. Both resolve the session with
`auth.api.getSession({ headers: fromNodeHeaders(req.headers) })`:

| Gate                | Behavior                                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `requireUser`       | Requires any session (Guest or Registered). Attaches the session to the request; `401 Unauthorized` if there is none. |
| `requireRegistered` | `requireUser` plus `403 Forbidden` when the user is a Guest (`user.isAnonymous`).                                     |

Downstream handlers read the owner through `getSessionData(req)` (never an untyped
request property). Add a gate to a route's `preHandler` chain to protect it:

```ts
app.post('/', { preHandler: [requireUser], schema: {/* ... */} }, handler);
```

### The `/api/auth/*` catch-all

`GET|POST /api/auth/*` delegates to better-auth's `toNodeHandler(auth)` on the raw
Node req/res. better-auth reads the **raw request body** itself, so Fastify's JSON
parser must not consume the stream first. The passthrough content-type parser is
registered in an **encapsulated child scope**, so only the auth route bypasses
JSON parsing — the rest of the API is unaffected. The route is
`{ schema: { hide: true } }`, so it never appears in the OpenAPI spec.

## The message allowance

The allowance is _our_ logic, not better-auth's rate limiter. It lives in the chat
send preHandler
[`chat.messageAllowance.hook.ts`](../apps/nebula-chat-server/src/modules/chat/chat.messageAllowance.hook.ts),
which runs after `requireUser` and before the cache hook, so a capped Guest is
rejected before any model or cache work:

- **Registered users are uncapped** — the check is skipped.
- **Regenerations don't count** — they replay an existing exchange.
- Otherwise the Guest's **live** `role='user'` count (`countUserMessagesByOwner`,
  a Postgres `count` joined to their conversations) is compared against
  `GUEST_MESSAGE_ALLOWANCE`. At or above the cap the send is rejected.

No Redis counter is used — at a cap of ~10 the live count is exact and stateless.

### The client contract

A capped Guest gets a **machine-readable** rejection the client renders as a login
wall — a `403` whose body is:

```json
{ "success": false, "error": "RegistrationRequired", "message": "..." }
```

The client detects `error === 'RegistrationRequired'` on the chat send path. (No
generated type exists for it — the `Chat` tag is excluded from the Orval client, so
the chat SSE endpoint is consumed by hand-written code.)

## The claim

When a Guest registers or signs in, better-auth's anonymous plugin fires
`onLinkAccount`, which calls `claimConversations(db, { fromUserId, toUserId })`
(`libs/auth/src/claim.ts`). It reassigns every `conversations.userId` from the
anonymous user to the newly linked account **before** the anonymous row is cleaned
up — so authenticating upgrades a Guest's history in place instead of wiping it.

## Schema

better-auth owns `user`/`session`/`account`/`verification`. In
[`libs/db/src/schema.ts`](../libs/db/src/schema.ts) the `users` table keeps its
name (`modelName: 'users'`) but carries better-auth's shape (`name`, `email`,
`emailVerified`, `image`, `isAnonymous`); `session`, `account`, and `verification`
are new. **`conversations.userId` is `NOT NULL`** — every conversation has an
owner. Migration `0002` relocates existing password hashes into `account` and
backfills `name`/`image`. Schema changes go through the normal
`pnpm --filter @nebula-chat/db db:generate` / `db:migrate` flow — better-auth has
no separate migrate step for Drizzle.

## Environment variables

Declared and validated in
[`apps/nebula-chat-server/src/env.ts`](../apps/nebula-chat-server/src/env.ts):

| Variable                  | Purpose                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`      | Signs sessions and the session cookie cache (required)                  |
| `BETTER_AUTH_URL`         | App base URL for better-auth cookies/redirects (required)               |
| `GUEST_MESSAGE_ALLOWANCE` | Guest `user`-message cap before registration is required (default `10`) |

## Not here yet

Deliberately out of the first slice (see ADR-0010 and the ticket's _Out of Scope_):

- **Social OAuth** (Google/GitHub) — config on the same instance, deferred to its
  own ticket ([#318](https://github.com/itsDaiton/nebula-chat/issues/318)).
- **Email verification / password reset** — the immediate follow-up; needs a
  transactional email provider decision.
- **Captcha** on the anonymous/sign-up path — an abuse backstop for the
  cookie-reset hole, alongside better-auth's IP rate limiting.
- **Owner-scoped read routes** — only `POST /api/conversations` is gated so far;
  filtering reads by owner is a tracked follow-up.
- **`@fastify/helmet` / CSRF hardening** beyond better-auth's defaults.
