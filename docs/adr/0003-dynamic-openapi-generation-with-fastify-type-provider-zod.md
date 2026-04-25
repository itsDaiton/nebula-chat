# ADR-0003: Dynamic OpenAPI Generation via fastify-type-provider-zod

- **Status:** Accepted
- **Date:** 2026-04-25
- **Deciders:** @itsDaiton

## Context

After the Fastify migration (ADR-0002) the backend's OpenAPI spec was generated through a parallel, hand-maintained registry: `@asteasolutions/zod-to-openapi` was used to extend Zod with an `.openapi()` method, and each module had a dedicated `*.openapi.ts` file that duplicated every route's path, method, request shape, and response shape into an `OpenAPIRegistry` via `registry.registerPath()`. `@fastify/swagger` was configured in **static mode** — it simply served the pre-built document passed to it; it had no connection to the actual Fastify route definitions.

This created structural drift risk: route definitions lived in `*.routes.ts` (with `preValidation: validate(...)`) while documentation lived in `*.openapi.ts` (with `registry.registerPath(...)`). The two could silently diverge. It also added four extra files per module, two extra packages (`@asteasolutions/zod-to-openapi`, `openapi3-ts`), the `js-yaml` serializer, and a custom `validate()` hook factory (`middleware/validate.ts`) that duplicated what Fastify's own schema layer already provides.

The alternative was already available: `fastify-type-provider-zod` integrates Zod directly with Fastify's native type-provider system, and `@fastify/swagger` in **dynamic mode** auto-generates the spec from the `schema:` block on each route definition — making the route the single source of truth for both validation and documentation.

## Decision

Replace the `@asteasolutions/zod-to-openapi` registry pattern with `fastify-type-provider-zod` in dynamic mode.

Install `fastify-type-provider-zod`. Register `validatorCompiler` and `serializerCompiler` on the Fastify instance in `buildApp()`. Switch `@fastify/swagger` from static to dynamic mode, passing `jsonSchemaTransform` as the `transform` option. Move all route metadata (description, summary, tags, operationId, body/params/querystring/response schemas) from `*.openapi.ts` files into `schema:` blocks on the corresponding route definitions in `*.routes.ts`. Change all route plugin types from `FastifyPluginAsync` to `FastifyPluginAsyncZod`. Delete all `*.openapi.ts` files, `src/openapi/`, `src/config/openapi.config.ts`, and `src/middleware/validate.ts`. Remove `@asteasolutions/zod-to-openapi`, `openapi3-ts`, and `js-yaml` from production dependencies. Extract `buildApp()` into `src/app.ts` so the generate script can import it without triggering `start()`; `src/server.ts` becomes a thin startup wrapper. Update the generate script to call `buildApp()` → `app.ready()` → `app.swagger({ yaml: true })` → write to `openapi/openapi.yaml`.

## Alternatives Considered

- **Keep the registry pattern, fix drift by linting.** Rejected — a linter rule that checks registry entries match route definitions is complex to author and maintain. The root cause is architectural (two representations of the same thing), not a missing tool.
- **`fastify-zod-openapi` (bridge library).** Rejected — it wraps `@asteasolutions/zod-to-openapi` more tightly with Fastify but keeps the registry concept, meaning `*.openapi.ts` files or equivalent configuration would persist. The goal is to eliminate the separate documentation layer entirely.
- **Hand-maintain a static `openapi.yaml`.** Rejected outright — more work and more drift.

## Consequences

- **Positive:**
  - Route definitions are the single source of truth for validation and documentation; they cannot drift apart.
  - Removes four files per module (`*.openapi.ts`), two source directories (`src/openapi/`, `src/config/openapi.config.ts`), and one middleware (`src/middleware/validate.ts`).
  - Removes three production dependencies (`@asteasolutions/zod-to-openapi`, `openapi3-ts`, `js-yaml`) and two dev deps (`@types/js-yaml`).
  - `validatorCompiler` and `serializerCompiler` give response-shape validation for free on all non-streaming routes — a new correctness guarantee.
  - Validation errors now flow through `setErrorHandler` (via `hasZodFastifySchemaValidationErrors`) instead of a custom `preValidation` hook, giving them consistent formatting with all other errors.
- **Negative / Tradeoffs:**
  - `generate:openapi` requires a full `.env` file (env vars are parsed at `buildApp()` import time). Previously the script imported a framework-neutral spec object that had no env dependency.
  - The `schema.response` Zod validators run on responses from non-streaming routes — any controller that sends extra fields not in the Zod schema will have them stripped silently.
  - `.openapi()` metadata calls (named schema refs, param hints) are no longer available; descriptions are expressed via Zod's `.describe()` instead. Named `$ref` components are not emitted in the current setup.
- **Neutral:**
  - Route paths, HTTP methods, request shapes, and response shapes are unchanged; `openapi/openapi.yaml` and the Orval-generated frontend client regenerate cleanly.
  - The `generate:openapi` script command (`pnpm --filter nebula-chat-server run generate:openapi`) is unchanged.
  - Swagger UI at `/docs` and raw spec at `/openapi.json` are preserved.

## Implementation Notes

- Files added: `src/app.ts` (extracted `buildApp()`), `src/errors/error.schema.ts` (shared Zod error response schema).
- Files modified: `src/server.ts` (thin startup wrapper), `src/errors/error.handler.ts` (adds `hasZodFastifySchemaValidationErrors` branch), all `*.routes.ts` files (type → `FastifyPluginAsyncZod`, add `schema:` block, remove `preValidation`), all `*.validation.ts` files (remove `import '@backend/config/openapi.config'` side-effect, remove `.openapi()` calls, replace with `.describe()`), `src/scripts/generate-openapi.ts` (imports `buildApp` from `@backend/app`), `package.json`.
- Files deleted: `src/config/openapi.config.ts`, `src/openapi/index.ts`, `src/openapi/schemas.ts`, `src/middleware/validate.ts`, and all four `*.openapi.ts` files (chat, conversation, message, cache).
- Dependencies removed: `@asteasolutions/zod-to-openapi`, `openapi3-ts`, `js-yaml` (production); `@types/js-yaml` (dev).
- Dependencies added: `fastify-type-provider-zod@^6.1.0` (requires Fastify ≥5.5.0; resolved Fastify version is 5.8.5).
- SSE streaming route (`POST /api/chat/stream`): uses `reply.hijack()` which bypasses Fastify's serialization lifecycle entirely; no `response.200` schema is defined on this route, so the serializer never runs. Error response schemas (400/404/413/429/500) are safe because the error handler always emits `{ success: false, error: string, message: string }` matching `errorResponseSchema`.
- Migrations required: none.
- OpenAPI/contract impact: spec regenerated from dynamic routes. Route paths, methods, and schema shapes are preserved.
- Rollback plan: revert the `feat/m-1-fastify` branch commits introducing these changes. No runtime state or DB migration involved.

## Verification

Implementation verified on branch `feat/m-1-fastify` (2026-04-25):

- `pnpm --filter nebula-chat-server typecheck` — passes (zero errors).
- `pnpm lint` — passes at repo root (zero warnings).
- No stale imports of `zod-to-openapi`, `openapi.config`, `openapi/schemas`, `middleware/validate`, `@backend/openapi`, `openapi3-ts`, or `js-yaml` remain in `src/`.
