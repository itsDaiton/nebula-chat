# Rate limits

Every limit in the API, with where it lives. Numbers are module-level constants, not env vars; change the
constant, this table and the test beside it together.

## Client key

All limits count per client IP, read from `CF-Connecting-IP`: Render fronts the API with Cloudflare, which sets
that header itself, whereas `X-Forwarded-For` keeps whatever the client sent. Fastify's limiter falls back to
`req.ip` when the header is absent; better-auth falls back to one shared bucket per path
([docs/auth.md](./auth.md#configuration)). The header is trustworthy only while the Render origin is reachable
solely through Cloudflare.

## Fastify routes

Counted in memory by `@fastify/rate-limit` (fixed window), so each server instance keeps its own counters.

| Scope                             | Limit                 | Bucket                  | Defined in                           |
| --------------------------------- | --------------------- | ----------------------- | ------------------------------------ |
| `/api/internal/*`                 | 10 per minute per IP  | one for the whole scope | `plugins/privilegedRoutes.plugin.ts` |
| `/api/admin/*`                    | 120 per minute per IP | one for the whole scope | `plugins/privilegedRoutes.plugin.ts` |
| `POST /api/sessions`              | 30 per minute per IP  | the route               | `modules/session/session.routes.ts`  |
| `POST /api/sessions/:id/messages` | 10 per minute per IP  | the route               | `modules/chat/chat.routes.ts`        |

The scope limits are an instance `onRequest` hook, which runs before the access gate, so a wrong operator token
counts toward `/api/internal/*`. The route limits run after the gate, so an unauthenticated call (401) does not
count. Every other route, the SSE stream included, has no Fastify limit.

A limited call answers `429` with the standard error envelope (`TooManyRequests`) and a `Retry-After` header.

## Own keys

Counted in Redis (`authStore`), so the limit holds across instances.

| Route                         | Limit                | Bucket                 | Defined in                                 |
| ----------------------------- | -------------------- | ---------------------- | ------------------------------------------ |
| `PUT /api/own-keys/:provider` | 10 per hour per User | one per User, all keys | `modules/ownKey/ownKey.writeLimit.hook.ts` |

A save is also the validation request (it enqueues the worker's check), so this one limit stops the endpoint probing keys.

## better-auth routes (`/api/auth/*`)

Counted in Redis (`authStore`), so the limits hold across instances. A window counts from the last allowed
request. Paths are better-auth's, without the `/api/auth` base; a custom rule replaces the default for its path.
Rules are in `libs/auth/src/auth.ts` (`AUTH_RATE_LIMIT_RULES`) unless noted.

| Path                                                                       | Limit                     | Source                                    |
| -------------------------------------------------------------------------- | ------------------------- | ----------------------------------------- |
| `/sign-in/anonymous` (Guest creation)                                      | 5 per hour per IP         | custom                                    |
| `/two-factor/*` (TOTP, backup codes)                                       | 5 per minute per IP       | custom (replaces the plugin's 3 per 10 s) |
| `/device/code` (CLI device code)                                           | 5 per minute per IP       | custom                                    |
| `/device` (user-code lookup)                                               | 5 per 10 minutes per IP   | device plugin: 5 per `expiresIn` (10 min) |
| other `/sign-in/*`, `/sign-up/*`, `/change-password`, `/change-email`      | 3 per 10 seconds per IP   | better-auth default                       |
| `/request-password-reset`, `/send-verification-email`, `/forget-password*` | 3 per minute per IP       | better-auth default                       |
| everything else                                                            | 100 per 10 seconds per IP | better-auth default                       |

A limited call answers `429` with better-auth's own body and `X-Retry-After`, not our error envelope.

## Per-user caps (not per IP)

| Cap                     | Limit                                                               | Counted in                        | Defined in                                              |
| ----------------------- | ------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------- |
| Profile image uploads   | 10 per hour per User, then `429`                                    | Redis (`profile-image-uploads:*`) | `modules/profileImage/profileImage.uploadLimit.hook.ts` |
| Guest message allowance | `GUEST_MESSAGE_ALLOWANCE`, default 10 Messages in total, then `403` | database count of Messages        | [docs/auth.md](./auth.md#reading-the-allowance)         |
| Spend allowance         | `SPEND_ALLOWANCE_USD`, default 1 USD/month, not Admins, then `403`  | the Model call ledger             | [docs/auth.md](./auth.md)                               |

The allowances are application quotas, not rate limits: they do not reset on a window and answer `403`.
The Guest allowance is why `/sign-in/anonymous` is limited: a fresh Guest is a fresh allowance.

## Not covered

- Limits under multi-instance load: the Fastify limiter does not share counters between instances.
- Per-User limits on chat: only the per-IP send limit and the allowances apply.
