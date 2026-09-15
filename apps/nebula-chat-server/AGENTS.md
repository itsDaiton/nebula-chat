# AGENTS.md — Backend (`nebula-chat-server`)

Conventions specific to the Fastify API. See the [root AGENTS.md](../../AGENTS.md) for monorepo-wide commands, git workflow, and cross-cutting rules (no barrels, `type` not `interface`, arrow functions) that also apply here.

---

## Table of Contents

1. [Directory Layout](#directory-layout)
2. [Module Pattern](#module-pattern)
3. [Error Handling](#error-handling)
4. [Validation](#validation)
5. [Database — Drizzle](#database--drizzle)
6. [Caching — Redis](#caching--redis)
7. [Chat Streaming](#chat-streaming)
8. [OpenAPI Docs](#openapi-docs)
9. [Path Aliases](#path-aliases)
10. [Environment Variables](#environment-variables)
11. [Testing](#testing)

---

## Directory Layout

```text
apps/nebula-chat-server/src/
├── app.ts                         # buildApp() factory — registers plugins, routes, compilers
├── server.ts                      # Thin entry point — calls buildApp() then app.listen()
├── env.ts                         # Zod-validated env schema — single source for all process.env reads
├── db.ts                          # DB client singleton (createDbClient from @nebula-chat/db)
├── config/
│   ├── cors.config.ts             # Allowed origins, CORS options
│   ├── headers.config.ts          # SSE + cache response headers (uses http.ServerResponse)
│   └── pagination.config.ts       # Default/max page limits
├── errors/
│   ├── AppError.ts                # Error class hierarchy
│   ├── error.handler.ts           # Fastify setErrorHandler callback (Zod, AppError, fallback)
│   └── error.schema.ts            # Shared Zod errorResponseSchema (used in route response schemas)
├── modules/
│   ├── chat/
│   │   ├── chat.types.ts
│   │   ├── chat.validation.ts     # Zod request/response schemas
│   │   ├── chat.prompt.ts         # Prompt assembly
│   │   ├── chat.service.ts        # Streaming orchestration
│   │   ├── chat.controller.ts
│   │   ├── chat.cacheCheck.hook.ts     # preHandler — replays a cached SSE stream on a hit
│   │   ├── chat.streamCapture.hook.ts  # preHandler — captures the SSE stream for caching
│   │   └── chat.routes.ts         # FastifyPluginAsyncZod; schema blocks + hook chain
│   ├── conversation/
│   │   ├── conversation.types.ts
│   │   ├── conversation.validation.ts
│   │   ├── conversation.repository.ts   # All Drizzle queries
│   │   ├── conversation.service.ts
│   │   ├── conversation.controller.ts
│   │   └── conversation.routes.ts
│   └── message/
│       ├── message.types.ts
│       ├── message.validation.ts
│       ├── message.repository.ts
│       ├── message.service.ts
│       ├── message.controller.ts
│       └── message.routes.ts
└── cache/                         # Redis-backed cache as its own module
    ├── cache.types.ts
    ├── cache.config.ts            # Key format, TTL (600 000 ms), max items (1000)
    ├── cache.client.ts            # Redis connection
    ├── cache.service.ts           # get, set, stats, eviction
    ├── cache.validation.ts
    ├── cache.controller.ts
    └── cache.routes.ts
```

---

## Module Pattern

Every feature module follows this strict 6-layer convention. Add files in this order when creating a new module:

```text
1. <module>.types.ts        — TypeScript types / DTOs (no logic)
2. <module>.validation.ts   — Zod schemas for request body/params/query/response
3. <module>.repository.ts   — Raw Drizzle queries; no business logic (omit if no DB access)
4. <module>.service.ts      — Business logic; calls repository; never touches req/res
5. <module>.controller.ts   — Calls service; builds HTTP response; minimal logic
6. <module>.routes.ts       — FastifyPluginAsyncZod default export; schema blocks + hook chain
```

New modules must be mounted in `buildApp()` in `src/app.ts` via `app.register(plugin, { prefix: '/api/<module>' })`. No separate OpenAPI registry step — the `schema:` block on each route is the single source of truth for both validation and documentation. Use the `backend-module-scaffold` skill or the `backend-module-builder` agent to generate one.

---

## Error Handling

All errors extend `AppError` from `errors/AppError.ts`. Use the subclass that matches the situation:

| Class                                      | HTTP status  | When to use                        |
| ------------------------------------------ | ------------ | ---------------------------------- |
| `NotFoundError`                            | 404          | Resource not found by ID           |
| `BadRequestError`                          | 400          | Invalid input not caught by Zod    |
| `UnauthorizedError`                        | 401          | Not authenticated                  |
| `ForbiddenError`                           | 403          | Authenticated but not allowed      |
| `PayloadTooLargeError`                     | 413          | Message exceeds token limit        |
| `MissingConfigurationError`                | 500          | Required env var not set           |
| `RedisConnectionError` / `RedisCacheError` | 500          | Redis failures (usually fail-open) |
| `APIError`                                 | configurable | External API errors                |

Throw from service layer; the `errorHandler` exported from `errors/error.handler.ts` and registered in `buildApp()` catches everything and returns:

```json
{ "success": false, "error": "NotFound", "message": "Conversation ... not found" }
```

Never return raw error objects to the client. Never throw from controllers — let the global handler do it.

---

## Validation

Validation is handled by Fastify's native schema layer via `fastify-type-provider-zod`. Define Zod schemas in the module's `*.validation.ts` file, then reference them in the `schema:` block of the corresponding route. Use `FastifyPluginAsyncZod` (not `FastifyPluginAsync`) so TypeScript infers request types from the schemas:

```ts
// conversation.routes.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { errorResponseSchema } from '@backend/errors/error.schema';
import { conversationController } from '@backend/modules/conversation/conversation.controller';
import { createConversationSchema, conversationResponseSchema } from './conversation.validation';

const conversationRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post('/', {
    schema: {
      description: 'Create a new conversation with a title',
      summary: 'Create conversation',
      tags: ['Conversations'],
      operationId: 'createConversation',
      body: createConversationSchema,
      response: {
        201: conversationResponseSchema.describe('Conversation created successfully'),
        400: errorResponseSchema.describe('Invalid request body'),
        500: errorResponseSchema.describe('Internal server error'),
      },
    },
    handler: conversationController.create,
  });
};
```

**Rule — every response entry must have `.describe('...')`:** `@fastify/swagger` emits "Default Response" for any response schema that has no description. Always call `.describe('...')` on the Zod schema at the point it is used in the `response:` block (not in the validation file — the description is route-contextual). This applies to success and error responses alike:

```ts
response: {
  201: conversationResponseSchema.describe('Conversation created successfully'),
  400: errorResponseSchema.describe('Invalid request body'),
  404: errorResponseSchema.describe('Conversation not found'),
  500: errorResponseSchema.describe('Internal server error'),
},
```

**Rule — every route needs a `schema:` block.** Routes without one produce "Default Response" entries. Use `{ schema: { hide: true } }` to explicitly exclude infrastructure routes (e.g. `/openapi.json`) from the spec rather than leaving them undocumented.

On validation failure the error is routed through `setErrorHandler`. Use `hasZodFastifySchemaValidationErrors(err)` (exported from `fastify-type-provider-zod`) in the error handler to detect and format these. Define schemas in `*.validation.ts` using plain Zod — no registry extensions needed. Use `.describe()` to add field-level descriptions for Swagger docs:

```ts
// conversation.validation.ts
import { z } from 'zod';

export const getConversationsQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(50)
    .optional()
    .default(10)
    .describe('Number of conversations to fetch (1-50, default 10)'),
  cursor: z.uuid().optional().describe('Pagination cursor for the next page'),
});
```

---

## Database — Drizzle

Schema lives at `libs/db/src/schema.ts` (`@nebula-chat/db`). Three tables: `users`, `conversations`, `messages` with FK constraints and indexes — see [CONTEXT.md](../../CONTEXT.md) for the domain vocabulary.

**Rules:**

- All Drizzle queries go in `*.repository.ts` files — never in services or controllers.
- The DB client is created in `src/db.ts` via `createDbClient` from `@nebula-chat/db`. Always import `db` from `@backend/db`.
- After changing the schema run `pnpm --filter @nebula-chat/db db:generate` in dev or `pnpm --filter @nebula-chat/db db:migrate` in prod. Use the `drizzle-migrate` skill or the `drizzle-migration-engineer` agent for schema changes.
- Conversations are cursor-paginated using the conversation `id` as the cursor.
- Max 20 messages are loaded into context for a single chat request.

---

## Caching — Redis

The cache is a Redis-backed SSE stream store keyed by conversation + model + prompt hash.

**Key format:** `conversation:{conversationId}:model:{model}:prompt:{sha256(prompt)[0:16]}`

**Flow:**

1. `chat.cacheCheck.hook.ts` preHandler runs before the controller. If a key exists it replays the cached token stream and returns — the LLM provider is never called.
2. `chat.streamCapture.hook.ts` preHandler monkey-patches `reply.raw.write` after a real completion call. When the response ends it saves the full SSE stream to Redis.
3. Max 1,000 cache entries. On overflow the oldest key (FIFO tracked in a Redis list) is evicted.
4. TTL: 600,000 ms (10 minutes).
5. **Fail-open:** all Redis errors are caught; the app continues without caching.

Cache stats and management endpoints live at `/api/cache/*`.

---

## Chat Streaming

The chat route is the most complex part of the backend. End-to-end flow:

```text
POST /api/chat/stream
  → @fastify/rate-limit               (10 req / 60 s per IP, opt-in via route config)
  → Zod body validation               (schema: { body: createChatStreamSchema } — native Fastify)
  → chat.cacheCheck.hook preHandler   (Redis hit → replay stream via reply.hijack() + reply.raw, done)
  → chat.streamCapture.hook preHandler (monkey-patches reply.raw.write to capture output)
  → chatController.streamMessage
      → chat.service
          1. Validate token budget (tiktoken — max 2 000 prompt, 10 000 context)
          2. Fetch conversation history (last 20 messages)
          3. DB transaction — create user message + conversation if new
          4. Call the LLM provider's streaming completion
          5. Pipe tokens to client as SSE events via reply.hijack() + reply.raw.write/reply.raw.end
          6. On stream end — persist assistant message + token usage
      → chat.streamCapture.hook saves captured output to Redis
```

**SSE event types emitted to the client:**

| Event                       | Data                                              |
| --------------------------- | ------------------------------------------------- |
| `conversation-created`      | `{ conversationId }`                              |
| `user-message-created`      | `{ messageId }`                                   |
| `token`                     | `{ token }` — one per streamed chunk              |
| `usage`                     | `{ promptTokens, completionTokens, totalTokens }` |
| `assistant-message-created` | `{ messageId }`                                   |
| `end`                       | `"end"`                                           |
| `error`                     | `{ error }`                                       |

Token budget (see [CONTEXT.md](../../CONTEXT.md#language) for the vocabulary):

- Max prompt tokens: **2 000**
- Max completion tokens: **1 000**
- Max context window: **10 000**

---

## OpenAPI Docs

OpenAPI documentation is generated dynamically by `@fastify/swagger` in dynamic mode, driven by `fastify-type-provider-zod`. There is no separate registry or `*.openapi.ts` file. The `schema:` block on each route is the single source of truth:

- `body`, `params`, `querystring` — Zod schemas for request validation and request docs
- `response` — Zod schemas per status code for response serialization and response docs
- `description`, `summary`, `tags`, `operationId` — OpenAPI metadata, inline on the route

The generated spec is served at `/openapi.json`; Swagger UI at `/docs`.

To export the spec as a static YAML file for the frontend Orval client, run:

```bash
pnpm --filter nebula-chat-server run generate:openapi  # writes openapi/openapi.yaml to repo root
```

The script (`src/scripts/generate-openapi.ts`) calls `buildApp()` → `app.ready()` → `app.swagger({ yaml: true })` and writes the result. It requires a full `.env` file since `buildApp()` parses env vars at startup.

**Rule:** After every change to the backend, re-run this script to keep `openapi/openapi.yaml` in sync with the current API state. Always commit the updated `openapi/openapi.yaml` alongside backend changes.

**Rule (API client regeneration):** Whenever `openapi/openapi.yaml` changes — whether you edited the backend and regenerated it, or the file changed for any other reason — immediately regenerate the typed frontend API client at `apps/nebula-chat-client/src/libs/api/generated/`:

```bash
pnpm --filter nebula-chat-client run generate:api
```

The generator is Orval, configured at `apps/nebula-chat-client/orval.config.ts`, driven by
`openapi/openapi.yaml`, and using the axios mutator at `apps/nebula-chat-client/src/libs/api/client.ts`.
Regenerated files in `apps/nebula-chat-client/src/libs/api/generated/` must be committed in the same PR as the
backend/OpenAPI change — never ship an API change with a stale client. Do not hand-edit anything under
`apps/nebula-chat-client/src/libs/api/generated/`; always regenerate. Use the `regenerate-api-client` skill or
the `api-contract-keeper` agent for this.

---

## Path Aliases

The backend uses `@backend/*` as a path alias for `src/*`:

```ts
import { db } from '@backend/db';
import { AppError } from '@backend/errors/AppError';
```

Never use relative paths in the backend. Aliases are configured in `tsconfig.json` and resolved at build time by `tsc-alias`.

---

## Environment Variables

`apps/nebula-chat-server/.env`:

| Variable                      | Purpose                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`              | OpenAI API key (optional — set at least one of this or `ANTHROPIC_API_KEY`)                                 |
| `ANTHROPIC_API_KEY`           | Anthropic API key (optional — set at least one of this or `OPENAI_API_KEY`)                                 |
| `DATABASE_URL`                | PostgreSQL connection string                                                                                |
| `REDIS_URL`                   | Redis connection (e.g. `redis://localhost:6380`)                                                            |
| `REDIS_PASSWORD`              | Redis password (if set)                                                                                     |
| `CLIENT_URL`                  | Frontend origin for CORS (e.g. `http://localhost:5173`)                                                     |
| `SERVER_URL`                  | Backend public URL (used in OpenAPI docs)                                                                   |
| `PORT`                        | Port to listen on (default `3000`)                                                                          |
| `LOG_LEVEL`                   | Log verbosity (default `info`; set to `debug`/`warn` etc. in prod)                                          |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector URL. Unset disables tracing entirely (`initTelemetry` no-ops)                                |
| `OTEL_LOG_LEVEL`              | Verbosity of the OTel SDK's own diagnostics (default `error`; `none`/`warn`/`info`/`debug`/`verbose`/`all`) |

> **`env.ts` rule:** All env vars are Zod-validated in `src/env.ts` and fail loudly at startup before any listener is bound. Never read `process.env.*` directly anywhere in the backend — always import from `@backend/env`.
>
> **One exception:** `@nebula-chat/otel` reads `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_LOG_LEVEL` from `process.env` itself — a published lib can't depend on one consumer's env schema. Both are still declared in `src/env.ts`. See [ADR-0007](../../docs/adr/0007-otel-lib-and-fastify-native-logger.md) for why, and [docs/logging.md](../../docs/logging.md) for how logging works.

---

## Testing

The monorepo-wide rules live in the root [`AGENTS.md`](../../AGENTS.md#testing) and
[ADR-0008](../../docs/adr/0008-vitest-unit-testing-with-an-enforced-coverage-gate.md). Backend specifics:

```bash
pnpm backend test              # vitest run
pnpm backend test:watch
pnpm backend test:coverage
```

- **One test file per source file, in a `tests/` folder beside it**: `chat.service.ts` is tested by
  `src/modules/chat/tests/chat.service.test.ts`. Never group several modules into one file.
- **`tsconfig.build.json` excludes `src/**/*.test.ts` and `src/**/tests/**`.** The build is
  `tsc && tsc-alias` over `src/**/*.ts`, so without those exclusions every test file compiles into
  `dist/` and ships in the production image. Do not remove them.
- **Route tests use `app.inject()`, never `supertest`.** Build the real app, mock only the repository:

  ```ts
  const app = await buildApp();
  const res = await app.inject({ method: 'GET', url: '/api/conversations' });
  expect(res.statusCode).toBe(200);
  ```

  This keeps routing, Zod validation, `error.handler.ts` and the `preHandler` hook chain under test. No
  socket is opened and no container is needed.

- **Mock at the nearest boundary to an external system, and nothing above it.** For a CRUD route that
  is the repository: `vi.mock` the `*.repository.ts` module and leave the service and controller real —
  mocking a service to test its own controller tests nothing. Two routes have their boundary elsewhere,
  because Postgres is not the system they talk to: `/api/chat/stream` reaches the LLM provider through
  `chat.service`, and the cache routes reach Redis through `cache.service`, so those are the modules to
  fake. The rule is the same one either way — fake the thing that would otherwise open a socket, keep
  everything between it and the HTTP boundary real — and the faked module gets its own `.service` test
  at its own seam.
- **No database, no Redis, no network.** The CI `DATABASE_URL` secret points at a shared database and is
  off-limits to tests.
- **Test each layer at its seam**: `.validation` (Zod schemas — accept and reject cases), `.service`
  (business logic with the repository mocked), and the route (via `app.inject()`). Cover the error paths
  too: validation failure, not-found, and rate-limited.
- **`AppError` mapping is a seam worth its own tests** — `errors/error.handler.ts` is what every route
  depends on for correct status codes.
