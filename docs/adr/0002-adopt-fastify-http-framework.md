# ADR-0002: Adopt Fastify as the HTTP Framework

- **Status:** Accepted
- **Date:** 2026-04-24
- **Deciders:** @itsDaiton

## Context

`apps/nebula-chat-server` is currently built on Express 5 with a hand-assembled middleware stack: `cors`, `express-rate-limit`, `swagger-ui-express` serving a Zod-generated OpenAPI spec at `/docs`, a custom `validate()` middleware, a custom `errorHandler`, `cacheCheck` / `streamCapture` around the SSE chat route, and `@prisma/adapter-pg` wiring the Prisma client. `src/server.ts` bootstraps this stack directly and reads `process.env` ad-hoc — there is no centralized env validation, so missing or malformed configuration surfaces as a runtime crash rather than a startup failure.

This ticket (`docs/new-backend/TICKET-M1-fastify.md`, "M-1 — Fastify API Layer") is the first ticket of the backend rearchitecture and explicitly **blocks M-6, M-7, M-8, M-9, and M-10** — every remaining application-level migration requires a Fastify app instance to register into. The downstream tickets need capabilities Express does not provide natively: first-class plugin encapsulation for auth (`@fastify/jwt` at M-6), queue dashboards (BullMQ at M-7), and WebSockets (`@fastify/websocket` at M-8); typed route schemas driven by Zod; built-in pino logging; `onClose` lifecycle hooks for graceful shutdown; and a shared `fastify-plugin`-based decoration pattern for sharing the db/redis clients across modules (prefigured by M-2).

The ticket also mandates removing `prisma generate` from the backend `build` script and deleting `@prisma/adapter-pg` (M-2 will replace Prisma with Drizzle, so the adapter is dead weight already).

## Decision

Replace Express 5 with Fastify 5 as the HTTP framework for `apps/nebula-chat-server`. Remove `express`, `cors`, `express-rate-limit`, `swagger-ui-express`, `@types/express`, `@types/cors`, and `@types/swagger-ui-express` from `apps/nebula-chat-server/package.json`. Add `fastify`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/swagger`, `@fastify/swagger-ui`, `@fastify/sensible`, `@fastify/under-pressure`, and `fastify-plugin`. Note: `@prisma/adapter-pg` is retained — Prisma 7's typed API requires an explicit adapter; it will be removed in M-2 when Prisma is replaced by Drizzle. Introduce `apps/nebula-chat-server/src/env.ts` as the first import in `server.ts` to Zod-parse `process.env` at startup so missing/invalid configuration fails loudly before any listener is bound. Port every Express middleware (`validate`, `rateLimiter`, `cacheCheck`, `streamCapture`, `errorHandler`) to an equivalent Fastify plugin or hook, and convert each module's `*.routes.ts` file to a `FastifyPluginAsync` registered with a `prefix` from `buildApp()`. Update the backend `build` script to `tsc && tsc-alias` (drop the `prisma generate &&` prefix).

## Alternatives Considered

- **Stay on Express 5.** Rejected — Express has no plugin encapsulation model, no built-in typed-schema handling, no first-party pino integration, and no standard `onClose` lifecycle. Every downstream ticket (auth, queues, websockets, observability) would require bespoke middleware glue, which is exactly the pattern the rearchitecture is walking away from. The current custom `validate`/`cacheCheck`/`streamCapture` stack is already the kind of bespoke wiring Fastify's plugin system replaces.
- **Hono.** Rejected — lighter-weight and ergonomically appealing, but the plugin ecosystem we need at M-6 through M-8 (JWT auth, rate limiting, Swagger UI, websockets, under-pressure-style load shedding) is not first-party. Adopting Hono would push that burden back into application code and undermine the encapsulation story that justifies leaving Express in the first place.

Only these two alternatives were seriously evaluated. Fastify is the explicit target of the migration plan and the only option where all downstream tickets (M-6/M-7/M-8) have named first-party plugins.

## Consequences

- **Positive:**
  - Typed route schemas via Zod → `zodToJsonSchema` give us request/response validation and OpenAPI generation from a single source.
  - Built-in pino logging (with `pino-pretty` in development) replaces ad-hoc `console.log` calls and integrates with the observability work planned for later tickets.
  - `onClose` hooks give us real graceful shutdown for the Prisma/Redis clients and the OpenAI SSE stream.
  - `fastify-plugin` establishes the pattern M-2 will use to share the db/redis client across modules without leaking through module boundaries.
  - Centralized Zod env validation (`src/env.ts`) converts misconfiguration from runtime crashes into clear startup errors — an acceptance criterion of the ticket.
  - `@fastify/under-pressure` provides load-shedding out of the box, which M-7 (queues) and M-8 (websockets) benefit from.
- **Negative / Tradeoffs:**
  - Full rewrite of the middleware layer: `validate`, `rateLimiter`, `cacheCheck`, `streamCapture`, and `errorHandler` must all be re-expressed as Fastify plugins / hooks. Behavior must be preserved verbatim for the chat SSE path.
  - SSE streaming no longer flows through `res.write()`; it must use `reply.hijack()` to opt out of Fastify's reply lifecycle and write raw to `reply.raw`. This is a non-trivial change on the hottest path in the backend.
  - Swagger UI moves from `swagger-ui-express` mounted on `/docs` to `@fastify/swagger-ui` with `routePrefix: '/docs'` — the URL is preserved but the integration surface is different, and the OpenAPI registry must emit a Fastify-compatible document.
  - Every agent and contributor who has internalized the Express request/response shape has to relearn `reply.send` / `reply.status` / `throw` semantics.
- **Neutral:**
  - Prisma, Redis, OpenAI, tiktoken, and the `AppError` hierarchy are unchanged — this ticket does not touch the service, repository, cache, or error layers.
  - The OpenAPI Zod registry in `src/openapi/` is framework-neutral and is reused as-is; only the serving layer changes.
  - Route paths (`/api/chat`, `/api/conversations`, `/api/messages`, `/api/cache`, `/health`, `/docs`, `/openapi.json`) are preserved, so the frontend and the Orval-generated client require no changes from this ticket alone.
  - `@backend/*` path aliases and `tsc-alias` resolution are unaffected.

## Implementation Notes

- Files touched (all under `apps/nebula-chat-server/`):
  - Added: `src/env.ts` (Zod env schema, first import in `server.ts`).
  - Modified: `src/server.ts` — replaced Express bootstrap with `buildApp()` returning a Fastify instance; registered `@fastify/sensible`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/swagger`, `@fastify/swagger-ui`, `@fastify/under-pressure`; mounted domain modules via `app.register(import('./modules/<m>/<m>.routes'), { prefix: '/api/<m>' })`; CORS plugin receives a single `corsOptions` object imported from `src/config/cors.config.ts` (single source of truth for origin allowlist, methods, credentials, and maxAge).
  - Modified: `src/config/cors.config.ts` — exports `corsOptions` (complete `@fastify/cors` options object) instead of a split `corsConfig`/`checkOrigin` pair; origin callback uses `cb(null, true|false)` rather than throwing; methods list is `['GET', 'HEAD', 'POST', 'DELETE', 'OPTIONS']` to cover all registered routes including `DELETE /api/cache/clear`.
  - Modified: every `src/modules/*/*.routes.ts` — converted from `express.Router()` to `FastifyPluginAsync` with `schema: { body, response }` driven by `zodToJsonSchema`.
  - Modified: `src/middleware/*.ts` — `validate`, `rateLimiter`, `cacheCheck`, `streamCapture`, `errorHandler` re-expressed as Fastify plugins / `onRequest` / `onSend` / `setErrorHandler` hooks. Chat streaming uses `reply.hijack()` and writes SSE events to `reply.raw`.
  - Modified: `package.json` — removed `express`, `@types/express`, `express-rate-limit`, `cors`, `@types/cors`, `swagger-ui-express`, `@types/swagger-ui-express`; retained `@prisma/adapter-pg` (required by Prisma 7 — removed in M-2); added `fastify`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/swagger`, `@fastify/swagger-ui`, `@fastify/sensible`, `@fastify/under-pressure`, `fastify-plugin`; `build` script changed from `prisma generate && tsc && tsc-alias` to `tsc && tsc-alias`.
- Migrations required: none — database schema is untouched.
- OpenAPI/contract impact: the served spec document is regenerated via `@fastify/swagger` from the same Zod registry. Route paths, request shapes, and response shapes are preserved, so `openapi/openapi.yaml` and the Orval-generated frontend client at `apps/nebula-chat-client/src/libs/api/generated/` should round-trip identically. Any incidental drift must be regenerated and committed in the same PR (`pnpm --filter nebula-chat-server run generate:openapi` then `pnpm --filter nebula-chat-client run generate:api`).
- Rollback plan: revert the `feat/m-1-fastify` branch. No runtime state or DB migration is created by this ticket, so rollback is a pure code revert. Because every downstream migration ticket (M-6…M-10) depends on Fastify, rolling back this ADR also rolls back the framework assumption those tickets will build on.

## Verification

Implementation verified on branch `feat/m-1-fastify` (2026-04-24):

- `pnpm --filter nebula-chat-server run typecheck` — passes (zero errors).
- `pnpm --filter nebula-chat-server run build` — passes; `dist/src/server.js` produced without running `prisma generate`.
- `pnpm lint` + `pnpm format:check` — pass at repo root (zero warnings).
- `pnpm --filter nebula-chat-server run generate:openapi` — OpenAPI spec regenerated; only `servers[0].url` changed (env-dependent), no route or schema regressions.
- `pnpm --filter nebula-chat-client run typecheck` — passes after Orval client regeneration.
- Static confirmation: all four route prefixes (`/api/chat`, `/api/conversations`, `/api/messages`, `/api/cache`) registered in `buildApp()` with the same paths and HTTP methods as before.
- Deviation: `@prisma/adapter-pg` retained; Prisma 7 typed API requires it. Will be removed in M-2 (Drizzle migration).
