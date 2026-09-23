# Authentication

Nebula Chat delegates authentication to [better-auth](https://better-auth.com),
configured once in the first-party library [`@nebula-chat/auth`](../libs/auth) and
mounted by the server. This document describes how the running system behaves. For
the rationale behind the design, see
[ADR-0010](./adr/0010-better-auth-for-auth.md); for the domain terms (**User**,
**Guest**, **Registered user**, **Message allowance**, **Claim**) see
[CONTEXT.md](../CONTEXT.md).

## Model

There is no sign-up wall. Access has three states:

| State           | How it is reached                               | Capability                                                            |
| --------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| Unauthenticated | No session cookie                               | Nothing — every API route returns `401`                               |
| Guest           | Client calls `POST /api/auth/sign-in/anonymous` | Full read/write, but streaming is capped at `GUEST_MESSAGE_ALLOWANCE` |
| Registered      | Guest or visitor signs up / signs in with email | Uncapped; inherits the Guest's conversations via the claim            |

A visitor becomes a Guest **only when the client explicitly requests an anonymous
session** — the server never mints one implicitly. On the first sign-up or sign-in,
the Guest's conversations are reassigned to the new account (see [Account linking](#account-linking)).

## Components

| Piece                 | Location                                                                                      | Responsibility                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `@nebula-chat/auth`   | [`libs/auth`](../libs/auth)                                                                   | Builds the configured better-auth instance. Takes all dependencies as injected config; never reads `process.env`.              |
| Server auth singleton | [`src/auth.ts`](../apps/nebula-chat-server/src/auth.ts)                                       | Constructs the one instance, injecting the resolved env, the `@nebula-chat/db` client, `redis.authStore`, and the Pino logger. |
| `authGate` plugin     | [`src/plugins/authGate.plugin.ts`](../apps/nebula-chat-server/src/plugins/authGate.plugin.ts) | Mounts the `/api/auth/*` handler and exposes the route gates.                                                                  |

`createAuth()` receives its dependencies rather than importing them, matching the
convention `@nebula-chat/otel` and `@nebula-chat/redis` follow:

```ts
export const auth = createAuth({
  db, // @nebula-chat/db client (Drizzle adapter)
  authStore, // @nebula-chat/redis SecondaryStorage
  logger, // @nebula-chat/otel Pino logger — better-auth's log sink
  secret, // BETTER_AUTH_SECRET
  baseURL, // BETTER_AUTH_URL
  trustedOrigins, // origins allowed to call the auth endpoints
});
```

Consumers import the singleton (`import { auth } from '@backend/auth'`) rather than
constructing their own, mirroring `src/db.ts` and `src/redis.ts`.

## Configuration

The instance is configured with:

| Setting                  | Value                                                                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database adapter         | Drizzle over `@nebula-chat/db` (`provider: 'pg'`). `advanced.database.generateId: 'uuid'` so Postgres generates ids, keeping `conversations.userId` a plain uuid FK. |
| Email / password         | Enabled. Password hashing is better-auth's built-in default (scrypt).                                                                                                |
| Anonymous plugin         | `POST /sign-in/anonymous` mints a Guest. Its `onLinkAccount` hook runs the claim.                                                                                    |
| Have I Been Pwned plugin | Rejects sign-up with a known-breached password (`400 PASSWORD_COMPROMISED`).                                                                                         |
| openAPI plugin           | Serves the auth API reference — see [API reference](#api-reference).                                                                                                 |
| `secondaryStorage`       | The `@nebula-chat/redis` `authStore` — sessions, verification records, and rate-limit counters.                                                                      |
| `session.cookieCache`    | Enabled — a short-lived signed cookie lets most requests validate without a store round-trip.                                                                        |
| `rateLimit`              | Enabled, `storage: 'secondary-storage'` (Redis).                                                                                                                     |

Redis is a hard dependency for authentication. Unlike the chat cache (fail-open,
ADR-0009), the `authStore` lets Redis errors propagate: durable identity survives in
Postgres, but live sessions depend on Redis, buffered only by the cookie-cache window.

## Endpoints

The server registers a single catch-all route,
`GET|POST /api/auth/*`, which hands the raw Node request/response to better-auth's
`toNodeHandler(auth)`. better-auth reads the raw request body itself, so the JSON
body parser is disabled **for this route only** via an encapsulated child scope; the
rest of the API keeps normal JSON parsing. The route is `{ schema: { hide: true } }`
and does not appear in the OpenAPI spec.

All authentication happens by calling better-auth's endpoints under `/api/auth`.
This instance exposes the following, given its configuration (email/password +
anonymous). The examples use a cookie jar (`jar.txt`) because auth is cookie-based —
`-c` writes the session cookies, `-b` sends them on the next call — and assume the
server is at `http://localhost:3000` (`BETTER_AUTH_URL`).

#### `POST /api/auth/sign-in/anonymous` — become a Guest

Creates a Guest user and session. Errors if the caller is already anonymous.

```bash
curl -i -c jar.txt -X POST http://localhost:3000/api/auth/sign-in/anonymous
```

#### `POST /api/auth/sign-up/email` — register

Registers with email + password. If a Guest session is present, the claim moves that
Guest's conversations to the new account. A breached password is rejected with
`400 PASSWORD_COMPROMISED`.

```bash
curl -i -b jar.txt -c jar.txt -X POST http://localhost:3000/api/auth/sign-up/email \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"a-long-unique-passphrase","name":"You"}'
```

#### `POST /api/auth/sign-in/email` — sign in

Signs in with email + password. If a Guest session is present, the claim runs as above.

```bash
curl -i -c jar.txt -X POST http://localhost:3000/api/auth/sign-in/email \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"a-long-unique-passphrase"}'
```

#### `GET /api/auth/get-session` — current session

Returns `{ session, user }`, or `null` when there is no session. This is how the
client learns its auth state.

```bash
curl -s -b jar.txt http://localhost:3000/api/auth/get-session
```

#### `POST /api/auth/sign-out` — sign out

Invalidates the current session and clears the session cookies.

```bash
curl -i -b jar.txt -X POST http://localhost:3000/api/auth/sign-out
```

#### `POST /api/auth/delete-anonymous-user` — delete the Guest

Deletes the current anonymous user (anonymous plugin). Only reachable while signed in
anonymously.

```bash
curl -i -b jar.txt -X POST http://localhost:3000/api/auth/delete-anonymous-user
```

### Interactive reference

The Fastify catch-all is `hide: true`, so these endpoints are absent from the
application's own `openapi.yaml`. better-auth's `openAPI` plugin serves an interactive
[Scalar](https://scalar.com/) reference at `/api/auth/reference`, backed by the
OpenAPI 3.1 schema at `/api/auth/open-api/generate-schema` (the reference UI fetches
that schema). The reference lists better-auth's full core catalogue — including
endpoints for features this instance does not enable (social sign-in, password reset,
email verification) — so the hand-written list above is the authoritative set of
active endpoints.

## Sessions and cookies

Authentication is **cookie-based**; the application does not issue JWTs or bearer
tokens. On a successful sign-in better-auth sets:

| Cookie                      | Contents                                                                                                                     | Attributes                                     |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `better-auth.session_token` | An opaque, secret-signed session identifier. The session record itself lives in Redis.                                       | `httpOnly`, `secure` in production, `SameSite` |
| `better-auth.session_data`  | A signed cache of the session + user (base64url + HMAC with `BETTER_AUTH_SECRET`), present because `cookieCache` is enabled. | `httpOnly`, `secure` in production             |

The session identifier is opaque and carries no claims: the source of truth is the
session record in Redis, keyed by that identifier. The `session_data` cookie is a
performance cache — most requests validate from it without touching Redis, and it is
re-derived from the record when it expires. There is no JWT because the app has no
need for a stateless, self-describing token verifiable by a third party; a
server-validated session keyed to a signed cookie is sufficient and lets a session be
revoked immediately by deleting its record.

Because both cookies are `httpOnly`, client-side JavaScript cannot read them. They
are visible in the browser under **DevTools → Application → Cookies**, and the client
learns its auth state by calling `GET /api/auth/get-session`, not by inspecting the
cookie.

## Storage

| Data                                                   | Store               | Rationale                                            |
| ------------------------------------------------------ | ------------------- | ---------------------------------------------------- |
| `users`, `account` (durable identity, password hashes) | Postgres            | A Redis outage must cost live sessions, not accounts |
| `session`, `verification`, rate-limit counters         | Redis (`authStore`) | Disposable, high-churn — kept off Postgres           |

Sessions are not persisted to Postgres (`storeSessionInDatabase` is unset); setting
that flag would move them there. The password hash lives on the `account` row
(`credential` provider), not on `users`.

## Route protection

The `authGate` plugin exposes two `preHandler` gates. Both resolve the session with
`auth.api.getSession({ headers: fromNodeHeaders(req.headers) })` and, on success,
attach it to the request:

| Gate                    | Behavior                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `requireAuthentication` | Requires any session (Guest or Registered). `401 Unauthorized` when there is none.          |
| `requireRegistered`     | `requireAuthentication` plus `403 Forbidden` when the user is a Guest (`user.isAnonymous`). |

Handlers read the owner through `getSessionData(req)` rather than an untyped request
property. A gate is added to a route's `preHandler` chain:

```ts
app.post('/', { preHandler: [requireAuthentication], schema: {/* ... */} }, handler);
```

Every conversation and message route is gated by `requireAuthentication`: there is no
unauthenticated read path, so a caller with no session receives `401` rather than
data. On top of the gate, reads are **owner-scoped** — `getConversation`,
`listConversations`, `searchConversations`, `getMessage`, and `listMessages` filter by
the session user, and the message and chat write paths verify the target conversation
belongs to the caller. A row owned by another user reads as **`404`** (never `403`),
so the gate never reveals that a row exists. The message allowance caps only
_streaming_; a capped Guest can still read their own conversations and messages.

## Message allowance

The allowance is application logic, not better-auth's rate limiter. It is enforced in
the chat-send `preHandler`
[`chat.messageAllowance.hook.ts`](../apps/nebula-chat-server/src/modules/chat/chat.messageAllowance.hook.ts),
which runs after `requireAuthentication` (so the session is attached) and before the
cache hook, so a capped Guest is rejected before any model or cache work:

- Registered users are uncapped — the check is skipped.
- Regenerations do not count — they replay an existing exchange.
- Otherwise the Guest's live `role='user'` message count (a Postgres `count` joined to
  their conversations) is compared against `GUEST_MESSAGE_ALLOWANCE`. At or above the
  cap, the send is rejected.

No Redis counter is involved; at a cap of ~10 the live count is exact and stateless.

### Client contract

A capped Guest receives a `403` carrying the shared error envelope (ADR-0011), with the
allowance and the Guest's count as typed `details`:

```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Guest message allowance reached. Register or sign in to continue.",
  "details": { "limit": 10, "count": 10 }
}
```

The client treats a `403` on the chat-send path as the allowance wall and prompts the
Guest to register or sign in. No generated type exists for it — the `Chat` tag is
excluded from the Orval client, so the chat SSE endpoint is consumed by hand-written
code.

## Account linking

When a Guest signs up or signs in, better-auth's anonymous plugin fires
`onLinkAccount`, which calls `claimConversations(db, { fromUserId, toUserId })`
([`libs/auth/src/claim.ts`](../libs/auth/src/claim.ts)). It reassigns every
`conversations.userId` from the anonymous user to the newly linked account **before**
the anonymous row is deleted, so authenticating upgrades a Guest's history in place
instead of discarding it.

## Schema

better-auth owns the `user`, `session`, `account`, and `verification` models. In
[`libs/db/src/schema.ts`](../libs/db/src/schema.ts) the `users` table keeps its name
(`modelName: 'users'`) and carries better-auth's shape (`name`, `email`,
`emailVerified`, `image`, `isAnonymous`); `session`, `account`, and `verification` are
new. `conversations.userId` is `NOT NULL` — every conversation has an owner. Migration
`0002` relocates existing password hashes into `account` and backfills `name`/`image`.
Schema changes go through the normal `pnpm --filter @nebula-chat/db db:generate` /
`db:migrate` flow; better-auth has no separate migrate step for the Drizzle adapter.

## Environment variables

Declared and validated in
[`apps/nebula-chat-server/src/env.ts`](../apps/nebula-chat-server/src/env.ts):

| Variable                  | Purpose                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`      | Signs sessions and the session cookie cache (required)                  |
| `BETTER_AUTH_URL`         | App base URL for better-auth cookies/redirects (required)               |
| `GUEST_MESSAGE_ALLOWANCE` | Guest `user`-message cap before registration is required (default `10`) |

## Not implemented

The following are configured on the same instance when added, and are deliberately
outside the current scope:

- Social OAuth (Google/GitHub).
- Email verification and password reset.
- Captcha on the anonymous / sign-up path.
- `@fastify/helmet` / CSRF hardening beyond better-auth's defaults.
