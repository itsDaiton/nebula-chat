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

| State           | How it is reached                                                 | Capability                                                            |
| --------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Unauthenticated | No session cookie                                                 | Nothing — every API route returns `401`                               |
| Guest           | Client calls `POST /api/auth/sign-in/anonymous`                   | Full read/write, but streaming is capped at `GUEST_MESSAGE_ALLOWANCE` |
| Registered      | Guest or visitor signs up / signs in with email, Google or GitHub | Uncapped; inherits the Guest's conversations via the claim            |

A visitor becomes a Guest **only when the client explicitly requests an anonymous
session** — the server never mints one implicitly. On the first sign-up or sign-in,
the Guest's conversations are reassigned to the new account (see [Account linking](#account-linking)).

## Components

| Piece                 | Location                                                                                      | Responsibility                                                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@nebula-chat/auth`   | [`libs/auth`](../libs/auth)                                                                   | Builds the configured better-auth instance. Takes all dependencies as injected config; never reads `process.env`.                                 |
| Server auth singleton | [`src/auth.ts`](../apps/nebula-chat-server/src/auth.ts)                                       | Constructs the one instance, injecting the resolved env, the `@nebula-chat/db` client, `redis.authStore`, the Pino logger, and the Resend sender. |
| `authGate` plugin     | [`src/plugins/authGate.plugin.ts`](../apps/nebula-chat-server/src/plugins/authGate.plugin.ts) | Mounts the `/api/auth/*` handler and exposes the route gates.                                                                                     |

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
  sendEmail, // createResendEmailSender({ apiKey: RESEND_API_KEY, from: EMAIL_FROM })
  errorURL, // `${CLIENT_URL}/auth` — where a failed social sign-in lands
  socialProviders, // socialProvidersFromEnv(env) — Google / GitHub OAuth apps that are configured
});
```

Consumers import the singleton (`import { auth } from '@backend/auth'`) rather than
constructing their own, mirroring `src/db.ts` and `src/redis.ts`.

## Configuration

The instance is configured with:

| Setting                  | Value                                                                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database adapter         | Drizzle over `@nebula-chat/db` (`provider: 'pg'`). `advanced.database.generateId: 'uuid'` so Postgres generates ids, keeping `conversations.userId` a plain uuid FK. |
| Email / password         | Enabled. Password hashing is better-auth's built-in default (scrypt). Password reset enabled; a reset revokes the user's other sessions.                             |
| Email verification       | Sent on sign-up (`sendOnSignUp`), **not required** to sign in; following the link verifies and signs the user in. See [Email](#email).                               |
| Social providers         | Google and GitHub, each enabled only when the server is given its OAuth client id + secret. See [Social sign-in](#social-sign-in).                                   |
| Anonymous plugin         | `POST /sign-in/anonymous` mints a Guest. Its `onLinkAccount` hook runs the claim.                                                                                    |
| Have I Been Pwned plugin | Rejects sign-up with a known-breached password (`400 PASSWORD_COMPROMISED`); a reset is checked by the reset guard instead.                                          |
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
and does not appear in the OpenAPI spec. The reply is hijacked, so a throw from the
handler (a Redis error from the `authStore`, say) never reaches `errorHandler`: the route
logs it as `http.request.failed` and answers `500` `Internal` itself, or drops the
connection if the headers were already sent.

All authentication happens by calling better-auth's endpoints under `/api/auth`.
This instance exposes the following, given its configuration (email/password with
verification and reset + social + anonymous). The examples use a cookie jar (`jar.txt`) because auth is cookie-based —
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

#### `POST /api/auth/sign-in/social` — sign in with Google or GitHub

Starts the OAuth flow and answers `{ url, redirect: true }`; the client sends the browser to
`url`, the provider's consent screen. `callbackURL` and `errorCallbackURL` must be trusted
origins (`CLIENT_URL`). A provider the server has no credentials for answers
`404 PROVIDER_NOT_FOUND`. See [Social sign-in](#social-sign-in) for the rest of the round trip.

```bash
curl -i -b jar.txt -c jar.txt -X POST http://localhost:3000/api/auth/sign-in/social \
  -H 'content-type: application/json' \
  -d '{"provider":"github","callbackURL":"http://localhost:5173/","errorCallbackURL":"http://localhost:5173/auth"}'
```

#### `GET /api/auth/callback/:provider` — the provider's redirect back

Where Google or GitHub returns the browser. Exchanges the code, signs the user in (creating
the account on first use), runs the claim if a Guest started the flow, and redirects to
`callbackURL`; on failure it redirects to `errorCallbackURL?error=<code>`.

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

#### `POST /api/auth/send-verification-email` — resend the verification email

Emails a fresh verification link. With a session, `email` must be the session user's,
and an already-verified email is rejected (`400 EMAIL_ALREADY_VERIFIED`). `callbackURL`
is where the link lands afterwards — the client passes its `/auth/verify-email` page.

```bash
curl -i -b jar.txt -X POST http://localhost:3000/api/auth/send-verification-email \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","callbackURL":"http://localhost:5173/auth/verify-email"}'
```

#### `GET /api/auth/verify-email` — follow the verification link

The emailed link. Verifies the email, refreshes the session cookie (or creates a session),
and redirects to `callbackURL`; on a bad token it redirects there with
`?error=TOKEN_EXPIRED` or `?error=INVALID_TOKEN`.

#### `POST /api/auth/request-password-reset` — forgot password

Emails a reset link when an account exists, and answers the same `200` either way.
`redirectTo` is the client's `/auth/reset-password` page.

```bash
curl -i -X POST http://localhost:3000/api/auth/request-password-reset \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","redirectTo":"http://localhost:5173/auth/reset-password"}'
```

The emailed link (`GET /api/auth/reset-password/:token`) redirects to `redirectTo?token=…`,
or `redirectTo?error=INVALID_TOKEN` when the token is unknown or expired.

#### `POST /api/auth/reset-password` — set the new password

Consumes the token and sets the password, then revokes the user's sessions and marks the
email verified (the emailed link proves ownership). A reset token works **once**, for **one
hour**; an unknown, expired, already-used or edited token is rejected with
`400 INVALID_TOKEN`. Requesting another link does not cancel earlier ones, which stay
usable until they expire.

A `before` hook in `@nebula-chat/auth` vets the new password while the token is still
unspent, because better-auth consumes the token before it hashes the password. It answers
`400 PASSWORD_COMPROMISED` (Have I Been Pwned) or `400 PASSWORD_REUSED` (the current
password), and the same link can be retried with a different password. The guard is
[`libs/auth/src/resetPassword.ts`](../libs/auth/src/resetPassword.ts).

```bash
curl -i -X POST http://localhost:3000/api/auth/reset-password \
  -H 'content-type: application/json' \
  -d '{"token":"<token from the link>","newPassword":"another-long-passphrase"}'
```

#### `POST /api/auth/change-password` — Password change (signed in)

A Registered user replaces their password by proving the current one. Body
`{ currentPassword, newPassword, revokeOtherSessions? }`; the client always sends
`revokeOtherSessions: true`, so every other auth session is deleted and the current device
gets a fresh session cookie (devices holding a still-valid cookie cache stay signed in until
it expires). better-auth answers `400 INVALID_PASSWORD` for a wrong current password,
`PASSWORD_TOO_SHORT` / `PASSWORD_TOO_LONG`, and `PASSWORD_COMPROMISED` (Have I Been Pwned).
The `before` hook in `@nebula-chat/auth` adds `400 PASSWORD_REUSED` when the new password
equals the current one (`findChangePasswordRejection` in
[`libs/auth/src/resetPassword.ts`](../libs/auth/src/resetPassword.ts)). No email is sent.

```bash
curl -i -X POST http://localhost:3000/api/auth/change-password \
  -H 'content-type: application/json' -b cookies.txt \
  -d '{"currentPassword":"old-passphrase","newPassword":"another-long-passphrase","revokeOtherSessions":true}'
```

#### `POST /api/auth/revoke-sessions` — sign out everywhere

Deletes every auth session of the signed-in user, the current one included, but leaves this
device's cookie in place, so Settings follows it with `sign-out`. Devices holding a still-valid
cookie cache stay signed in until it expires (up to 5 minutes).

#### `POST /api/auth/delete-user` — Account deletion

Enabled by `user.deleteUser.enabled` in `@nebula-chat/auth`. Body `{ password? }`: a user with
a credential password must send it — the `before` hook answers `400 PASSWORD_REQUIRED` when they
don't (better-auth alone would accept a sign-in under a day old), and better-auth `400
INVALID_PASSWORD` when it's wrong. A user without one (Google/GitHub only) sends nothing and
needs an auth session younger than a day (`400 SESSION_EXPIRED` otherwise). The guard is
[`libs/auth/src/deleteAccount.ts`](../libs/auth/src/deleteAccount.ts). Deletes the user's accounts, sessions and user row; their conversations and
messages go with it through the `ON DELETE CASCADE` foreign keys. Clears the session cookie.

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
endpoints for features this instance does not enable (account deletion, email
change) — so the hand-written list above is the authoritative set of
active endpoints.

## Sessions and cookies

Authentication is **cookie-based**; the application does not issue JWTs or bearer
tokens. On a successful sign-in better-auth sets:

| Cookie                      | Contents                                                                                                                     | Attributes                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `better-auth.session_token` | An opaque, secret-signed session identifier. The session record itself lives in Redis.                                       | `httpOnly`, `SameSite=Lax`, `secure` in production |
| `better-auth.session_data`  | A signed cache of the session + user (base64url + HMAC with `BETTER_AUTH_SECRET`), present because `cookieCache` is enabled. | `httpOnly`, `SameSite=Lax`, `secure` in production |

Over HTTPS better-auth adds the `__Secure-` prefix, so production names are
`__Secure-better-auth.session_token` and `__Secure-better-auth.session_data`.

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

### The client and the API must share a site

Browsers neither store nor send a `SameSite=Lax` cookie on a request between two
different _sites_ (registrable domains). The client and the API therefore have to be
the same site in every environment, or sign-in silently fails: the anonymous sign-in
answers `200`, the browser drops its cookie, and every later request is a `401`.

| Environment | Client                       | API                          |
| ----------- | ---------------------------- | ---------------------------- |
| Local       | `http://localhost:5173`      | `http://localhost:3000`      |
| Production  | `https://www.nebula-chat.cz` | `https://api.nebula-chat.cz` |

Two `onrender.com` subdomains do **not** qualify: `onrender.com` is on the Public
Suffix List, so `x.onrender.com` and `y.onrender.com` are different sites. Production
needs the API on a subdomain of the client's own domain. Loosening the cookies to
`SameSite=None` is not a substitute — Safari and Brave block cross-site cookies outright.

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

- Verified Registered users are uncapped — the check is skipped. A Registered user whose
  email is still unverified is metered exactly like a Guest until they verify.
- Regenerations do not count — they replay an existing exchange.
- Otherwise the user's live `role='user'` message count (a Postgres `count` joined to
  their conversations) is compared against `GUEST_MESSAGE_ALLOWANCE`. At or above the
  cap, the send is rejected.

No Redis counter is involved; at a cap of ~10 the live count is exact and stateless.

### Client contract

A capped Guest receives a `403` carrying the shared error envelope (ADR-0011) with the
`MessageAllowanceReached` code. The message names the configured allowance:

```json
{
  "success": false,
  "error": "MessageAllowanceReached",
  "message": "Message allowance exceeded: a Guest can send at most 10 messages."
}
```

The client treats the `MessageAllowanceReached` code as the allowance wall and prompts the
Guest to register or sign in. It switches on the code, not the status: a plain `Forbidden`
is also a `403`. No generated type exists for it — the `Chat` tag is
excluded from the Orval client, so the chat SSE endpoint is consumed by hand-written
code.

## Email

Verification and password-reset emails go through **Resend** (ADR-0021). The lib builds
each message from one [React Email](https://react.email) layout
([`libs/auth/src/AuthEmail.tsx`](../libs/auth/src/AuthEmail.tsx)), configured per email in
[`libs/auth/src/authEmails.tsx`](../libs/auth/src/authEmails.tsx) and rendered to HTML plus a
plain-text part. The logo travels as an inline attachment (`cid:`) rather than a remote
image, so it shows without a hosted asset. The message goes to the
injected `sendEmail` (`EmailSender`); `createResendEmailSender`
([`libs/auth/src/resend.ts`](../libs/auth/src/resend.ts)) is the Resend implementation the
server passes in. Sends run as better-auth background tasks, so a response never waits on
Resend (no timing signal about which emails have accounts) and a failed send is logged as
`auth.library.log` rather than failing the request. Both links expire after an hour.
Requesting a reset or resending verification is rate-limited to 3 per minute; the client
shows a "wait a minute" message on the `429`.

Verification does not block sign-in: requiring it would stop sign-up from creating a
session, and the claim below runs on that session. Instead an unverified Registered user
keeps the Guest [message allowance](#message-allowance) until they verify. The client reads
`user.emailVerified` and shows them a "verify your email" prompt with a resend button,
which turns into "verify your email to keep chatting" once the allowance is spent.

Following a verification link signs its owner in. In a browser holding a different
Guest's session, that is a sign-in like any other, so the claim below moves that Guest's
conversations into the account.

The client pages better-auth redirects to:

| Page                    | Reached from                         | Shows                                                                            |
| ----------------------- | ------------------------------------ | -------------------------------------------------------------------------------- |
| `/auth/forgot-password` | "Forgot your password?" on sign-in   | Email form → "check your inbox" (same message whether or not the account exists) |
| `/auth/reset-password`  | The reset link (`?token` / `?error`) | New-password form, or "invalid or expired" with a link to request another        |
| `/auth/verify-email`    | The verification link (`?error`)     | Verified, or expired / invalid with a resend button                              |

## Social sign-in

Google and GitHub sign-in are better-auth `socialProviders`. The lib takes their OAuth
credentials as `socialProviders` in `createAuth()`; the server builds that from the
`GOOGLE_*` / `GITHUB_*` env vars ([`src/utils/socialProviders.ts`](../apps/nebula-chat-server/src/utils/socialProviders.ts)),
enabling a provider only when both its id and secret are set. Either one alone fails boot.

Each provider's OAuth app registers the redirect URI
`<BETTER_AUTH_URL>/api/auth/callback/<provider>` — locally
`http://localhost:3000/api/auth/callback/google` and `…/github`.

The round trip, from the auth page's "Continue with Google / GitHub":

1. The client calls `signIn.social({ provider, callbackURL, errorCallbackURL })` with the
   chat root and `/auth` as absolute client URLs, and follows the returned `url`. A Guest's
   session cookie rides along; the anonymous plugin records the Guest in the OAuth state.
2. The provider redirects to `/api/auth/callback/<provider>`, which signs the user in and
   runs `onLinkAccount` — the same [claim](#account-linking) as email sign-in.
3. better-auth redirects to the chat root. The app loads afresh, `get-session` returns the
   Registered user, and the Guest's conversations are theirs.

A failure lands on `/auth?error=<code>`, which the page explains: `access_denied` (the user
cancelled at the provider), `account_not_linked` (the email already belongs to an account
better-auth will not link automatically — say, one whose email is unverified),
`email_not_found` (the provider shared no email); any other code gets a generic message.
A callback with no usable OAuth state (`state_not_found`, …) never knew the client's
`errorCallbackURL`, so `createAuth`'s `errorURL` (better-auth's `onAPIError.errorURL`)
sends it to `/auth` too, instead of better-auth's own error page. The email a provider reports as verified
arrives verified, so that user is uncapped at once.

## Account linking

When a Guest signs up or signs in — with email or through a social provider's callback —
better-auth's anonymous plugin fires
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

| Variable                  | Purpose                                                                        |
| ------------------------- | ------------------------------------------------------------------------------ |
| `BETTER_AUTH_SECRET`      | Signs sessions and the session cookie cache (required)                         |
| `BETTER_AUTH_URL`         | App base URL for better-auth cookies/redirects (required)                      |
| `RESEND_API_KEY`          | Resend API key for the verification and reset emails (required)                |
| `EMAIL_FROM`              | Their sender, `address` or `Name <address>` on a verified domain (required)    |
| `GUEST_MESSAGE_ALLOWANCE` | Guest `user`-message cap before registration is required (default `10`)        |
| `GOOGLE_CLIENT_ID`        | Google OAuth client id; with its secret, enables Google sign-in (optional)     |
| `GOOGLE_CLIENT_SECRET`    | Google OAuth client secret (optional; set both Google vars, or neither)        |
| `GITHUB_CLIENT_ID`        | GitHub OAuth app client id; with its secret, enables GitHub sign-in (optional) |
| `GITHUB_CLIENT_SECRET`    | GitHub OAuth app client secret (optional; set both GitHub vars, or neither)    |

## Not implemented

The following are configured on the same instance when added, and are deliberately
outside the current scope:

- Captcha on the anonymous / sign-up path.
- `@fastify/helmet` / CSRF hardening beyond better-auth's defaults.
