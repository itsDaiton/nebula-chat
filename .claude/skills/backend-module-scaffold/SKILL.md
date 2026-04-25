---
name: backend-module-scaffold
description: Scaffold the 7 layered files for a new backend module following the strict convention (types → validation → repository → service → controller → routes → openapi). Use when adding a new feature module under apps/nebula-chat-server/src/modules/.
allowed-tools: Read, Write
argument-hint: '<module-name>'
---

# Backend Module Scaffold

Creates all 7 layered files for a new module and registers it.

## Preconditions

- `$ARGUMENTS` is the module name in kebab-case (e.g. `user-profile`) and singular.
- An ADR in `docs/adr/` covers the new module.
- Read an existing module (e.g. `apps/nebula-chat-server/src/modules/conversation/`) as the live reference.

## Files to create

Under `apps/nebula-chat-server/src/modules/$ARGUMENTS/`:

1. `$ARGUMENTS.types.ts` — `type` definitions (domain + DTO shapes).
2. `$ARGUMENTS.validation.ts` — Zod schemas for request bodies/params/queries.
3. `$ARGUMENTS.repository.ts` — Prisma queries (the ONLY place Prisma is called).
4. `$ARGUMENTS.service.ts` — business logic; throws `AppError` subclasses.
5. `$ARGUMENTS.controller.ts` — thin Express handlers; calls service; no business logic.
6. `$ARGUMENTS.routes.ts` — Router, wires middleware (`validate`, rate-limit, cache where needed).
7. `$ARGUMENTS.openapi.ts` — OpenAPI registry entries.

## Registration

- Mount the router in `apps/nebula-chat-server/src/routes/index.ts`.
- Register the OpenAPI spec in `apps/nebula-chat-server/src/openapi/index.ts`.

## Post-scaffold

- Hand off to `api-contract-keeper` to regenerate `openapi.yaml` + Orval client.
- Ask `test-strategist` to add at least one happy-path integration test.

## Anti-goals

- No Prisma outside `.repository.ts`.
- No bare `Error` throws — use `AppError` subclasses.
- No relative imports — `@backend/*` only.
- No `index.ts` barrels.
