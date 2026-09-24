---
name: backend-module-scaffold
description: Scaffold the 6 layered files for a new backend module following the strict convention (types → validation → repository → service → controller → routes). Use when adding a new feature module under apps/nebula-chat-server/src/modules/.
allowed-tools: Read, Write
argument-hint: '<module-name>'
---

# Backend Module Scaffold

Creates all 6 layered files for a new module and registers it.

## Preconditions

- `$ARGUMENTS` is the module name in kebab-case (e.g. `user-profile`) and singular.
- An ADR should already exist in `docs/adr/` for a new module (authored upstream via `/domain-modeling` during `/grill-with-docs`/`/to-spec`). If one is clearly missing and warranted, flag it to the user rather than blocking.
- Read an existing module (e.g. `apps/nebula-chat-server/src/modules/conversation/`) as the live reference.

## Files to create

Under `apps/nebula-chat-server/src/modules/$ARGUMENTS/`:

1. `$ARGUMENTS.types.ts` — `type` definitions (domain + DTO shapes). No logic.
2. `$ARGUMENTS.validation.ts` — Zod schemas for request bodies/params/queries and responses, using `.describe('...')` on every field.
3. `$ARGUMENTS.repository.ts` — Drizzle queries (the ONLY place Drizzle is called). Omit if the module has no DB access.
4. `$ARGUMENTS.service.ts` — business logic; calls the repository; throws `AppError` subclasses; never touches req/res.
5. `$ARGUMENTS.controller.ts` — calls the service; builds the HTTP response; minimal logic.
6. `$ARGUMENTS.routes.ts` — `FastifyPluginAsyncZod` default export, with a `schema:` block per route (`body`/`params`/`querystring`, `response` per status code — each with `.describe('...')`, `description`, `summary`, `tags`, `operationId`). This is the single source of truth for both validation and OpenAPI docs — there is no separate `*.openapi.ts` file.

## Registration

- Mount the router in `apps/nebula-chat-server/src/app.ts` via `app.register(plugin, { prefix: '/api/$ARGUMENTS' })`.

## Post-scaffold

- Run the `regenerate-api-client` skill to regenerate `openapi.yaml` + Orval client.
- Add at least one happy-path integration test (`app.inject()`).

## Anti-goals

- No Drizzle outside `.repository.ts`.
- No bare `Error` throws — use `AppError` subclasses from `@nebula-chat/errors`.
- No relative imports — `@backend/*` only.
- No `index.ts` barrels.
- No `*.openapi.ts` file and no `FastifyPluginAsync` (use `FastifyPluginAsyncZod`) — this module predates the Fastify/Zod migration only if it doesn't follow this pattern, which would itself be a bug to fix, not a pattern to copy.
