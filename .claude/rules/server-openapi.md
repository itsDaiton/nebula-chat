---
paths:
  - 'apps/server/src/scripts/**'
  - 'apps/server/src/**/*.routes.ts'
  - 'apps/client/orval.config.ts'
  - 'openapi/**'
---

# OpenAPI Docs

OpenAPI documentation is generated dynamically by `@fastify/swagger` in dynamic mode, driven by
`fastify-zod-openapi`: its plugin is registered before `@fastify/swagger`, which takes
`fastifyZodOpenApiTransformers`. The document is OpenAPI 3.1 (the minimum `zod-openapi` renders), and
`servers` is always `/`. There is no separate registry or `*.openapi.ts` file. The `schema:` block on each
route is the single source of truth:

- `body`, `params`, `querystring` — Zod schemas for request validation and request docs
- `response` — a `jsonResponse(description, schema)` per status code, for response serialization and response docs
- `description`, `summary`, `tags`, `operationId` — OpenAPI metadata, inline on the route

The generated spec is served at `/openapi.json`; Swagger UI at `/docs`.

To export the spec as static YAML for the Orval clients, run:

```bash
pnpm --filter @nebula-chat/server run generate:openapi  # writes openapi/openapi.yaml to repo root
```

The script (`src/scripts/generate-openapi.ts`) calls `buildApp()` → `app.ready()` → `app.swagger({ yaml: true })` and writes the result. It needs no environment (see [Commands](../../apps/server/AGENTS.md#commands)).

**Rule:** After every change to the backend, re-run this script to keep `openapi/openapi.yaml` in sync with the current API state. Always commit the updated `openapi/openapi.yaml` alongside backend changes.

**Rule (API client regeneration):** Whenever `openapi/openapi.yaml` changes — whether you edited the backend and regenerated it, or the file changed for any other reason — immediately regenerate both typed clients — the frontend's at `apps/client/src/libs/api/generated/` and the CLI's (`Operator` and `Admin` tags) — then typecheck both to surface broken call sites:

```bash
pnpm --filter @nebula-chat/client run generate:api
pnpm --filter @nebula-chat/cli run generate:api
```

The generator is Orval, configured at `apps/client/orval.config.ts`, driven by
`openapi/openapi.yaml`, and using the axios mutator at `apps/client/src/libs/api/client.ts`.
Regenerated files in `apps/client/src/libs/api/generated/` must be committed in the same PR as the
backend/OpenAPI change — never ship an API change with a stale client. Do not hand-edit anything under
`apps/client/src/libs/api/generated/`; always regenerate.
