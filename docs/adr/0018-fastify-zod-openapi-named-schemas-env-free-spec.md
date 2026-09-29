# ADR-0018: fastify-zod-openapi, named response schemas, and an env-free spec script

- **Status:** Accepted — implemented by NEB-385 (#385)
- **Date:** 2026-09-27
- **Deciders:** @itsDaiton
- **Supersedes:** [ADR-0003](./0003-dynamic-openapi-generation-with-fastify-type-provider-zod.md) — the provider choice and how the spec is generated. Routes as the single source of truth still stands.
- **Amends:** [ADR-0011](./0011-shared-errors-lib-and-typed-envelope.md) §5 — nothing needs pruning any more

## Context

ADR-0003 made each route's `schema:` block the single source of truth, with `fastify-type-provider-zod` and `@fastify/swagger` in dynamic mode. That part works. What grew around it doesn't:

- **Orval names types after status codes.** No response schema has an id, so every response is inline in the spec and Orval names it `operationId + status`: `getHealth200`, `listConversations200ConversationsItem`, `listMessages200Item`. The client aliases them back to something readable by hand. Only `ErrorEnvelope`/`ErrorCode` (ADR-0011) are named components, which shows the fix.
- **The provider emits an `…Input` twin of every named schema**, whether or not a request uses it. `pruneUnreferencedSchemas` exists only to delete them again. v7 of the library still does this.
- **Generating the spec needs a full environment.** The script boots `buildApp()`, and `env.ts` rejects missing database, Redis, auth and LLM settings at import. NEB-383 added `OPENAPI_*` stand-ins to get past it, even though no connection is ever opened.
- **The committed spec depends on `SERVER_URL`** through `servers.url`, which nothing reads.

## Decision

1. **Use `fastify-zod-openapi` as the type provider** in place of `fastify-type-provider-zod`. The routes keep their `schema:` blocks, and `@fastify/swagger` stays in dynamic mode. It builds on `zod-openapi`, which creates a separate `…Output` component only when a schema is used in both directions and differs. The pruning step goes away. Its serializer still `safeParse`s every reply, so response validation (ADR-0003) is kept.
2. **The spec is OpenAPI 3.1.** This is forced, not chosen: `zod-openapi` supports 3.1.0 at minimum.
3. **Every response resource schema carries `.meta({ id })`**, declared next to the schema in the module's `*.validation.ts`, as a plain noun (`Conversation`, `ConversationPage`, `Message`, `Health`, `ApiRoot`) with no `…Response` suffix. Request bodies, params and querystrings stay unnamed, because Orval's names for them (`CreateConversationBody`, `ListConversationsParams`) are already good. A server test fails if any `2xx` JSON response in the generated document is an inline object instead of a `$ref`.
4. **`generate:openapi` stays a plain `tsx` script that needs no environment.** It assigns placeholder values with `??=` for every variable `env.ts` requires before importing the app, the same way the test setup does, so a real variable always wins. The `OPENAPI_*` stand-ins are removed.
5. **`servers.url` is hard-coded to `/`.** `SERVER_URL` remains only as a CORS origin.
6. **No CI drift check**, neither for `openapi.yaml` against the routes nor for the Orval output against the spec. Regenerating both stays a manual step through the `regenerate-api-client` skill.

## Considered options

- **Keep `fastify-type-provider-zod` and just add ids.** Fixes the naming with the least churn, but keeps the twin-and-prune step and OpenAPI 3.0. Rejected in favour of removing the workaround instead of maintaining it. The cost is a smaller library (roughly 120 GitHub stars against 590).
- **Decorator-based routing** (NestJS with `@nestjs/swagger`, `fastify-decorators`). Fastify's own `decorate()` extends the instance and is not a TypeScript decorator. The decorator options either replace the framework (reversing ADR-0002) or carry the same schema objects in annotations. Neither fixes naming or the env dependency.
- **Contract-first with no codegen** (oRPC, ts-rest). The client would import types from a shared contract, removing Orval and the spec step. Rejected because the spec is a published, versioned contract (`openapi` package, `/docs`), and dropping Orval loses the generated MSW handlers the client tests rely on.
- **A different client generator** (e.g. `@hey-api/openapi-ts`). Only hides the naming problem, which lives on the server, and loses MSW generation.
- **Generate the spec from a Vitest file snapshot**, which gives a drift check for free. Rejected as more machinery than a generator script should need.

## Consequences

- Generated client types carry real names, and the client imports `Conversation`/`Message` instead of aliasing `…200…` types.
- The wire format does not change, but component names and the OpenAPI version do. For codegen consumers of the `openapi` package this is a non-breaking `feat`, noted in its changelog.
- The spec can go stale silently. A route change without a regeneration is caught only in review.
- `Conversation` is a deliberate, temporary use of a `CONTEXT.md` _Avoid_ term. NEB-352 renames it to `Session` and lands after this.
