# AGENTS.md — Backend (`nebula-chat-server`)

Conventions specific to the Fastify API. See the [root AGENTS.md](../../AGENTS.md) for monorepo-wide commands, git workflow, and cross-cutting rules (no barrels, `type` not `interface`, arrow functions) that also apply here.

---

## Commands

Run from `apps/nebula-chat-server` (or `pnpm --filter nebula-chat-server run <cmd>` from the root):

```bash
pnpm dev              # tsx watch mode (auto-restart) — assumes lib artifacts already built
pnpm start            # node dist/src/server.js (production)
pnpm generate:openapi # regenerate openapi/openapi.yaml from live route schemas
```

`build` and `typecheck` must run via Turbo from the repo root, so workspace lib artifacts (`dist/*.d.ts`) build first: `pnpm turbo run build --filter=nebula-chat-server` (and `typecheck` likewise).

**`@nebula-chat/db` migrations** (`libs/db` has no separate AGENTS.md):

```bash
pnpm --filter @nebula-chat/db db:push      # sync schema to local DB without migration files (dev)
pnpm --filter @nebula-chat/db db:generate  # generate SQL migration files from schema changes
pnpm --filter @nebula-chat/db db:migrate   # apply pending migration files (production)
pnpm --filter @nebula-chat/db db:baseline  # report journal state; --apply marks existing migrations applied
pnpm --filter @nebula-chat/db db:studio    # open Drizzle Studio GUI
```

`DATABASE_URL` is read from `apps/nebula-chat-server/.env` by both the server at runtime and the DB CLI — single source of truth. `db:migrate` calls the drizzle-orm migrator directly (`src/migrate.ts`) rather than `drizzle-kit migrate`, which exits 1 without printing the underlying Postgres error. `db:baseline` is for a database whose schema predates the migration journal: it reports what it would do and only writes with `--apply`.

---

## Directory Layout

```text
apps/nebula-chat-server/src/
├── app.ts                         # buildApp() factory — registers plugins, routes, compilers
├── server.ts                      # Thin entry point — calls buildApp() then app.listen()
├── env.ts                         # Zod-validated env schema — single source for all process.env reads
├── db.ts                          # DB client singleton (createDbClient from @nebula-chat/db)
├── redis.ts                       # Redis toolkit singleton + chat cache helpers (createRedis from @nebula-chat/redis)
├── auth.ts                        # better-auth instance singleton (createAuth from @nebula-chat/auth)
├── config/
│   ├── cors.config.ts             # Allowed origins, CORS options
│   ├── headers.config.ts          # SSE + cache response headers (uses http.ServerResponse)
│   └── pagination.config.ts       # Default/max page limits
├── errors/
│   ├── error.handler.ts           # Fastify setErrorHandler callback (Zod, AppError, PG codes, fallback); logs a 5xx once
│   └── requestErrorType.ts        # Per-request error classification, read by the http.request.completed line
├── modules/
│   ├── chat/
│   │   ├── chat.types.ts
│   │   ├── chat.validation.ts     # Zod request/response schemas
│   │   ├── chat.prompt.ts         # Prompt assembly
│   │   ├── chat.service.ts        # Streaming orchestration
│   │   ├── chat.controller.ts
│   │   ├── chat.cacheCheck.hook.ts     # preHandler — replays a cached SSE stream on a hit
│   │   ├── chat.streamCapture.hook.ts  # preHandler — captures the SSE stream for caching
│   │   ├── chat.messageAllowance.hook.ts # preHandler — rejects a Guest over the message allowance
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
├── test/                          # Shared test harness: createTestApp, session fixtures, logCapture (in-memory logger)
├── utils/
│   ├── logController.ts           # Fastify logController: request lines off, framework faults stamped fastify.log
│   ├── logLevelOverrides.ts       # LOG_LEVEL_OVERRIDES parser (component=level pairs)
│   ├── requestPath.ts             # url.path: the request path without its query string
│   ├── pruneUnreferencedSchemas.ts
│   └── trustProxy.ts
└── plugins/
    ├── requestLogging.plugin.ts   # Root hooks: http.request.received (debug) + one http.request.completed (info)
    ├── db.plugin.ts               # Decorates app.db (@nebula-chat/db)
    ├── redis.plugin.ts            # Decorates app.redis (@nebula-chat/redis); closes it on shutdown
    └── authGate.plugin.ts         # `authGate`: mounts /api/auth/* (better-auth handler); decorates requireAuthentication/requireRegistered; binds the User onto req.log/reply.log
```

Redis is no longer an in-app module. It lives in the `@nebula-chat/redis` lib
(shared connection + `cache` primitive), registered via `plugins/redis.plugin.ts`
and consumed through `app.redis.cache`. See [ADR-0009](../../docs/adr/0009-nebula-chat-redis-lib.md).

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

New modules must be mounted in `buildApp()` in `src/app.ts` via `app.register(plugin, { prefix: '/api/<module>' })`. No separate OpenAPI registry step — the `schema:` block on each route is the single source of truth for both validation and documentation. Use the `backend-module-scaffold` skill to generate one.

---

## Error Handling

The error vocabulary lives in the shared **`@nebula-chat/errors`** lib (`libs/errors`), which both apps
import — see [ADR-0011](../../docs/adr/0011-shared-errors-lib-and-typed-envelope.md). Throw the `AppError`
subclass that matches the situation, imported from `@nebula-chat/errors`:

| Class                          | HTTP status | Code (`error`)            | When to use                               |
| ------------------------------ | ----------- | ------------------------- | ----------------------------------------- |
| `BadRequestError`              | 400         | `BadRequest`              | Invalid input not caught by Zod           |
| `ValidationError`              | 400         | `Validation`              | Data that breaks a rule (Zod, DB checks)  |
| `UnauthorizedError`            | 401         | `Unauthorized`            | Not authenticated                         |
| `ForbiddenError`               | 403         | `Forbidden`               | Authenticated but not allowed             |
| `MessageAllowanceReachedError` | 403         | `MessageAllowanceReached` | A Guest has spent their message allowance |
| `NotFoundError`                | 404         | `NotFound`                | Resource not found by ID                  |
| `ConflictError`                | 409         | `Conflict`                | The data clashes with an existing record  |
| `PayloadTooLargeError`         | 413         | `PayloadTooLarge`         | Message exceeds token limit               |
| `TooManyRequestsError`         | 429         | `TooManyRequests`         | A rate limit was hit                      |
| `MissingConfigurationError`    | 500         | `Internal`                | Required env var not set                  |

The code decides the status (`ERROR_STATUS` in `libs/errors/src/errorStatus.ts`), so the two cannot disagree.

Throw from the service layer; the `errorHandler` exported from `errors/error.handler.ts` and registered in
`buildApp()` catches everything and answers with the shared **error envelope**:

```json
{ "success": false, "error": "NotFound", "message": "Conversation ... not found" }
```

- An `AppError` builds its own envelope with `toEnvelope()`. Never write an envelope literal by hand.
- `error` is a closed union (`ErrorCode`), not a free string. `Internal` is the escape hatch for anything
  unclassified, and its message is always the generic `GENERIC_ERROR_MESSAGE`. A raw message reaches the
  client only from a non-`Internal` `AppError`, or from a Fastify 4xx, whose message is written for the caller.
- The envelope is flat: `{ success: false, error, message }` for every code. A case the client must tell apart
  gets its own code rather than extra fields, like `MessageAllowanceReached` (a 403, like `Forbidden`).
- The handler turns everything it catches into an `AppError`: Zod validation failures, Postgres constraint
  codes, and framework errors (classified by their status). A framework error keeps its own status (415, 503).
- The chat stream hijacks its reply, so it never reaches `errorHandler`. `chat.service` classifies its own
  failures with `toErrorEnvelope` and writes the **same** envelope as the SSE `error` event.
- To add a code, add it to `errorCodeSchema` in `libs/errors/src/errorEnvelope.ts` and give it a status in
  `ERROR_STATUS` (the compiler insists on both). Then regenerate the OpenAPI spec and the Orval client.

Never return raw error objects to the client. Never throw from controllers — let the global handler do it.

---

## Logging

The full conventions are in [docs/logging.md](../../docs/logging.md). The rules that bite:

- **Every line goes through `logEvent(logger, level, event, attributes, msg)`** from `@nebula-chat/otel`,
  or through a stamped adapter. An event name or attribute key missing from the catalogue
  (`libs/otel/src/events.ts`, `libs/otel/src/attributes.ts`) is a compile error — add it there.
- **Inside a request, log through `req.log`.** It carries `http.request.id`, and the User once a gate has
  run. Outside a request, use `@backend/logger`. Never `console`.
- **Log an error once, where it is handled**, under `err` (never `error`; ESLint rejects it). Code that
  throws does not also log. A 4xx writes no line of its own.
- **One `info` line per unit of work** (`http.request.completed`, `chat.reply.completed`); progress inside
  it is `debug`.
- **Never log** Message content, prompts, completions, Streaming tokens, emails, names, cookies,
  `Authorization` headers or API keys. Opaque ids are fine.

---

## Validation

Validation is handled by Fastify's native schema layer via `fastify-type-provider-zod`. Define Zod schemas in the module's `*.validation.ts` file, then reference them in the `schema:` block of the corresponding route. Use `FastifyPluginAsyncZod` (not `FastifyPluginAsync`) so TypeScript infers request types from the schemas:

```ts
// conversation.routes.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
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
        400: errorEnvelopeSchema.describe('Invalid request body'),
        500: errorEnvelopeSchema.describe('Internal server error'),
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
  400: errorEnvelopeSchema.describe('Invalid request body'),
  404: errorEnvelopeSchema.describe('Conversation not found'),
  500: errorEnvelopeSchema.describe('Internal server error'),
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

Schema lives at `libs/db/src/schema.ts` (`@nebula-chat/db`). The domain tables are `users`, `conversations`, `messages`; better-auth owns `session`, `account`, and `verification` (see [ADR-0010](../../docs/adr/0010-better-auth-for-auth.md)). `conversations.userId` is **NOT NULL** — every conversation has an owner. See [CONTEXT.md](../../CONTEXT.md) for the domain vocabulary.

**Rules:**

- All Drizzle queries go in `*.repository.ts` files — never in services or controllers.
- The DB client is created in `src/db.ts` via `createDbClient` from `@nebula-chat/db`. Always import `db` from `@backend/db`.
- After changing the schema run `pnpm --filter @nebula-chat/db db:generate` in dev or `pnpm --filter @nebula-chat/db db:migrate` in prod. Use the `drizzle-migrate` skill for schema changes.
- Conversations are cursor-paginated using the conversation `id` as the cursor.
- Max 20 messages are loaded into context for a single chat request.

---

## Caching — Redis

Redis access is provided by the **`@nebula-chat/redis`** lib (shared connection manager +
single-tier `cache` primitive), registered by `plugins/redis.plugin.ts` and reached through
`app.redis`. The chat cache helpers (`chatCacheKey`, `getCachedStream`, `saveCachedStream`) live in
`src/redis.ts` alongside the toolkit singleton and are imported from `@backend/redis`. See
[ADR-0009](../../docs/adr/0009-nebula-chat-redis-lib.md).

**Key format** (built in `src/redis.ts` via the lib's `buildKey`/`hashText`, kept as-is per ADR-0009):
`conversation:{conversationId}:model:{model}:prompt:{sha256(lastUserMessage)[0:16]}`

**Flow:**

1. `chat.cacheCheck.hook.ts` preHandler runs before the controller. If `regenerate` is set it bypasses the cache; otherwise, on a hit it replays the cached token stream and returns — the LLM provider is never called.
2. `chat.streamCapture.hook.ts` preHandler monkey-patches `reply.raw.write` after a real completion call. When the response ends it saves (and, on regenerate, overwrites) the full SSE stream to Redis.
3. TTL: 600 seconds (10 minutes). The keyspace is bounded by TTL + Redis `maxmemory-policy` (`allkeys-lru`) — there is no hand-rolled eviction.
4. **Fail-open:** every cache operation swallows Redis errors (read → miss, write → no-op), logged at `warn` as `cache.*.failed` through `@nebula-chat/otel`; the app continues without caching.

Cache hit/miss are emitted as OpenTelemetry metrics; there are no `/api/cache/*` admin endpoints (removed in the migration — a dashboard is a later concern).

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
| `error`                     | the error envelope (`ErrorEnvelope`)              |

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
`apps/nebula-chat-client/src/libs/api/generated/`; always regenerate. Use the `regenerate-api-client` skill for this.

---

## Path Aliases

The backend uses `@backend/*` as a path alias for `src/*`:

```ts
import { db } from '@backend/db';
import { errorHandler } from '@backend/errors/error.handler';
```

Never use relative paths in the backend. Aliases are configured in `tsconfig.json` and resolved at build time by `tsc-alias`.

---

## Environment Variables

`apps/nebula-chat-server/.env`:

| Variable                      | Purpose                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`              | OpenAI API key (optional — set at least one of this or `ANTHROPIC_API_KEY`)                                      |
| `ANTHROPIC_API_KEY`           | Anthropic API key (optional — set at least one of this or `OPENAI_API_KEY`)                                      |
| `DATABASE_URL`                | PostgreSQL connection string                                                                                     |
| `REDIS_URL`                   | Redis connection (e.g. `redis://localhost:6380`)                                                                 |
| `REDIS_PASSWORD`              | Redis password (if set)                                                                                          |
| `CLIENT_URL`                  | Frontend origin for CORS (e.g. `http://localhost:5173`)                                                          |
| `SERVER_URL`                  | Backend public URL (used in OpenAPI docs)                                                                        |
| `BETTER_AUTH_SECRET`          | better-auth secret — signs sessions and the session cookie cache (required)                                      |
| `BETTER_AUTH_URL`             | App base URL for better-auth cookies/redirects (required, e.g. `http://localhost:3000`)                          |
| `GUEST_MESSAGE_ALLOWANCE`     | Guest `user`-message cap before registration is required (int, default `10`; ADR-0010)                           |
| `PORT`                        | Port to listen on (default `3000`)                                                                               |
| `LOG_LEVEL`                   | Log verbosity (default `info`; set to `debug`/`warn` etc. in prod)                                               |
| `LOG_LEVEL_OVERRIDES`         | Per-component levels, comma-separated `component=level` (e.g. `redis=debug,auth=warn`); unknown level fails boot |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector URL. Unset = spans are not exported (the tracer still runs, so lines keep their `trace_id`)       |
| `OTEL_LOG_LEVEL`              | Verbosity of the OTel SDK's own diagnostics (default `error`; `none`/`warn`/`info`/`debug`/`verbose`/`all`)      |

> **`env.ts` rule:** All env vars are Zod-validated in `src/env.ts` and fail loudly at startup before any listener is bound. Never read `process.env.*` directly anywhere in the backend — always import from `@backend/env`.
>
> **One exception:** `@nebula-chat/otel` reads `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_LOG_LEVEL` from `process.env` itself — a published lib can't depend on one consumer's env schema. Both are still declared in `src/env.ts`. See [ADR-0007](../../docs/adr/0007-otel-lib-and-fastify-native-logger.md) for why, and [docs/logging.md](../../docs/logging.md) for how logging works.

The `BETTER_AUTH_*` and `GUEST_MESSAGE_ALLOWANCE` vars feed `@nebula-chat/auth`. See [docs/auth.md](../../docs/auth.md) for how authentication works (the route gates, the message allowance, and the claim) and [ADR-0010](../../docs/adr/0010-better-auth-for-auth.md) for the decisions behind it.

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
  mocking a service to test its own controller tests nothing. `/api/chat/stream` has its boundary
  elsewhere, because Postgres is not the system it talks to: it reaches the LLM provider through
  `chat.service` and Redis through `@backend/redis` (`src/redis.ts`), so those are the modules the route
  test fakes. The rule is the same one either way — fake the thing that would otherwise open a socket,
  keep everything between it and the HTTP boundary real — and the faked module gets its own unit test at
  its own seam (`src/tests/redis.test.ts`; the lib's `cache` primitive is tested in `@nebula-chat/redis`).
- **No database, no Redis, no network.** The CI `DATABASE_URL` secret points at a shared database and is
  off-limits to tests.
- **Test each layer at its seam**: `.validation` (Zod schemas — accept and reject cases), `.service`
  (business logic with the repository mocked), and the route (via `app.inject()`). Cover the error paths
  too: validation failure, not-found, and rate-limited.
- **`AppError` mapping is a seam worth its own tests** — `errors/error.handler.ts` is what every route
  depends on for correct status codes.
