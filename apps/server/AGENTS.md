# AGENTS.md — Backend (`@nebula-chat/server`)

Conventions specific to the Fastify API. See the [root AGENTS.md](../../AGENTS.md) for monorepo-wide commands, git workflow, and cross-cutting rules (no barrels, `type` not `interface`, arrow functions) that also apply here.

How a request moves through the plugins and route gates, the data model and the Direct reply flow are
drawn in [docs/architecture.md](../../docs/architecture.md); auth flows in [docs/auth.md](../../docs/auth.md).

---

## Commands

Run from `apps/server` (or `pnpm --filter @nebula-chat/server run <cmd>` from the root):

```bash
pnpm dev              # nodemon (see nodemon.json): restarts on src, .env and built lib changes — assumes lib artifacts already built
pnpm start            # node dist/src/server.js (production)
pnpm generate:openapi # regenerate openapi/openapi.yaml from live route schemas
```

`generate:openapi` needs no `.env` and no env vars. It fills a placeholder for every var `src/env.ts` requires before loading the app, a real var always wins, and no database or Redis connection is opened. The output does not depend on the environment.

`build` and `typecheck` must run via Turbo from the repo root, so workspace lib artifacts (`dist/*.d.ts`) build first: `pnpm turbo run build --filter=@nebula-chat/server` (and `typecheck` likewise).

**`@nebula-chat/db` migrations** (`libs/db` has no separate AGENTS.md):

```bash
pnpm --filter @nebula-chat/db db:push      # sync schema to local DB without migration files (dev)
pnpm --filter @nebula-chat/db db:generate  # generate SQL migration files from schema changes
pnpm --filter @nebula-chat/db db:migrate   # apply pending migration files (production)
pnpm --filter @nebula-chat/db db:baseline  # report journal state; --apply marks existing migrations applied
pnpm --filter @nebula-chat/db db:studio    # open Drizzle Studio GUI
```

`DATABASE_URL` lives in `apps/server/.env`, which the server's `dev`/`start` scripts and every `db:*`
script load through `dotenvx run` — single source of truth (see [Environment Variables](#environment-variables)).
`db:migrate` calls the drizzle-orm migrator directly (`src/migrate.ts`) rather than `drizzle-kit migrate`, which exits 1 without printing the underlying Postgres error. `db:baseline` is for a database whose schema predates the migration journal: it reports what it would do and only writes with `--apply`.

---

## Directory Layout

`src/` is `app.ts` (the `buildApp()` factory), `server.ts` (entry: `listen` plus signal handling), `env.ts`
(the only `process.env` reader), singletons (`db.ts`, `redis.ts`, `queue.ts`, `auth.ts`, `logger.ts`) and:

- `modules/<name>/` — one 6-layer module each (below): `chat`, `stream`, `session`, `message`,
  `models`, `profileImage`, `logLevel`, and `run` (only a repository so far: the send path creates Runs). A module may add hooks (`*.hook.ts`) and helpers beside its layers.
- `plugins/` — Fastify plugins: request logging, `db`, `redis`, and `authGate` (mounts `/api/auth/*`,
  decorates `requireAuthentication` / `requireRegistered`).
- `errors/` — the global error handler. `config/` — CORS, SSE headers, pagination. `utils/` — small shared helpers.
- `test/` — the shared harness (`createTestApp`, in-memory pub/sub, reply streams, profile image store).

Redis lives in the `@nebula-chat/redis` lib ([ADR-0009](../../docs/adr/0009-nebula-chat-redis-lib.md)),
registered by `plugins/redis.plugin.ts`, which closes the job queue and then the toolkit on shutdown.

---

## Module Pattern

Every feature module follows this strict 6-layer convention. Add files in this order when creating a new module:

```text
1. <module>.types.ts        — TypeScript types / DTOs (no logic)
2. <module>.validation.ts   — Zod schemas for request body/params/query/response
3. <module>.repository.ts   — Raw Drizzle queries; no business logic (omit if no DB access)
4. <module>.service.ts      — Business logic; calls repository; never touches req/res
5. <module>.controller.ts   — Calls service; builds HTTP response; minimal logic
6. <module>.routes.ts       — FastifyPluginCallbackZodOpenApi default export; schema blocks + hook chain
```

New modules must be mounted in `buildApp()` in `src/app.ts` via `app.register(plugin, { prefix: '/api/<module>' })`.
The one exception is `chat`, mounted at `/api`: sending lives under the Session it goes to
(`/api/sessions/:sessionId/messages`, ADR-0014). No separate OpenAPI registry step — the `schema:` block on each route is the single source of truth for both validation and documentation.

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
{ "success": false, "error": "NotFound", "message": "Session ... not found" }
```

- An `AppError` builds its own envelope with `toEnvelope()`. Never write an envelope literal by hand.
- `error` is a closed union (`ErrorCode`), not a free string. `Internal` is the escape hatch for anything
  unclassified, and its message is always the generic `GENERIC_ERROR_MESSAGE`. A raw message reaches the
  client only from a non-`Internal` `AppError`, or from a Fastify 4xx, whose message is written for the caller.
- The envelope is flat: `{ success: false, error, message }` for every code. A case the client must tell apart
  gets its own code rather than extra fields, like `MessageAllowanceReached` (a 403, like `Forbidden`).
- The handler turns everything it catches into an `AppError`: Zod validation failures, Postgres constraint
  codes, and framework errors (classified by their status). A framework error keeps its own status (415, 503).
- The reply stream relay hijacks its reply once the owner check has passed, so nothing after that reaches
  `errorHandler`. A reply's own failure arrives from the worker as an `error` event already carrying the
  envelope; a Redis failure mid-relay is written as an `error` event with the `Internal` envelope, then `end`.
- The `/api/auth/*` catch-all hijacks its reply too. A throw from better-auth's handler is logged through
  `logRequestFailed` and answered `500` `Internal` on `reply.raw`; once headers are out, the connection is
  dropped instead.
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
  run. Outside a request, use `@server/logger`. Never `console`.
- **Log an error once, where it is handled**, under `err` (never `error`; ESLint rejects it). Code that
  throws does not also log. A 4xx writes no line of its own.
- **One `info` line per unit of work** (`http.request.completed`, `chat.reply.completed`); progress inside
  it is `debug`.
- **Never log** Message content, prompts, completions, Streaming tokens, emails, names, cookies,
  `Authorization` headers or API keys. Opaque ids are fine.

---

## Validation

Validation is handled by Fastify's native schema layer via `fastify-zod-openapi` (see
[ADR-0018](../../docs/adr/0018-fastify-zod-openapi-named-schemas-env-free-spec.md)). Define Zod schemas in the
module's `*.validation.ts` file, then reference them in the `schema:` block of the corresponding route. Use
`FastifyPluginCallbackZodOpenApi` (not `FastifyPluginCallback`) so TypeScript infers request types from the schemas.
Registering routes awaits nothing, so the plugin is a callback that ends with `done()`: an `async` one with no
`await` is Sonar's `typescript:S7503`:

```ts
// session.routes.ts
import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { sessionController } from '@server/modules/session/session.controller';
import {
  sessionResponseSchema,
  createSessionSchema,
} from '@server/modules/session/session.validation';
import { jsonResponse } from '@server/utils/jsonResponse';

const sessionRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.post('/', {
    schema: {
      description: 'Create a new session with a title',
      summary: 'Create session',
      tags: ['Sessions'],
      operationId: 'createSession',
      body: createSessionSchema,
      response: {
        201: jsonResponse('Session created successfully', sessionResponseSchema),
        400: jsonResponse('Invalid request body', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    handler: sessionController.create,
  });
  done();
};
```

**Rule — every response entry is `jsonResponse('description', schema)`:** `fastify-zod-openapi` reads a
response's description from the response object, not from the schema, so a bare schema (or one with
`.describe('...')`) documents as "Default Response". The description is route-contextual, so it lives in the
`response:` block, not the validation file — success and error responses alike (see the example above).

The one exception is an SSE response (`GET /api/streams/:streamId`): its 200 entry declares `text/event-stream` with a described string schema, since the body is not JSON and the client reads it with a fetch mutator, not a generated model.

**Rule — every response resource schema carries `.meta({ id })`:** declare it on the schema in the module's
`*.validation.ts`, as a plain noun with no `…Response` suffix (`Session`, `SessionPage`, `Message`).
The spec then declares it once as a named component, and Orval generates a model with that name. Without an id
the body is inlined, and Orval names it after the operation and status (`listMessages200Item`). A route hidden with
`hide: true` needs no id, since it has no place in the spec. An array of a
named schema needs no id of its own. Request bodies, params and querystrings stay unnamed.
`src/tests/app.test.ts` fails on any inline `2xx` JSON object.

```ts
export const sessionResponseSchema = z
  .object({ id: z.uuid(), title: z.string(), createdAt: isoDateTimeSchema })
  .meta({ id: 'Session' });
```

A response timestamp the handler holds as a `Date` is `isoDateTimeSchema` (`@server/utils/isoDateTimeSchema`), never `z.date().transform(...)`. The handler returns the row's `Date`, the reply holds its ISO string, and the spec shows a `date-time` string. A bare `.transform` has no output type for the spec to render.

**Rule — every route needs a `schema:` block.** Routes without one produce "Default Response" entries. Use `{ schema: { hide: true } }` to explicitly exclude infrastructure routes (e.g. `/openapi.json`) from the spec rather than leaving them undocumented.

On a request validation failure Fastify throws `FST_ERR_VALIDATION`, whose `validation` entries are
`fastify-zod-openapi`'s `RequestValidationError`s. `errors/error.handler.ts` detects them with `instanceof
RequestValidationError` and answers `400` with the `Validation` code. A reply that fails its response schema
answers `500` `Internal`. Define schemas in `*.validation.ts` using plain Zod — no registry extensions needed.
Use `.describe()` on schema fields for Swagger docs.

---

## Database — Drizzle

Schema lives at `libs/db/src/schema.ts` (`@nebula-chat/db`). The domain tables are `users`, `sessions`, `messages`; better-auth owns `session`, `account`, and `verification` (see [ADR-0010](../../docs/adr/0010-better-auth-for-auth.md)). `sessions.userId` is **NOT NULL** — every session has an owner. See [CONTEXT.md](../../CONTEXT.md) for the domain vocabulary.

**Rules:**

- All Drizzle queries go in `*.repository.ts` files — never in services or controllers.
- The DB client is created in `src/db.ts` via `createDbClient` from `@nebula-chat/db`. Always import `db` from `@server/db`.
- After changing the schema run `pnpm --filter @nebula-chat/db db:generate` in dev or `pnpm --filter @nebula-chat/db db:migrate` in prod. Never edit an applied migration; write a follow-up one, and use `db:generate`, not `db:push`, whenever production needs the change.
- Sessions are cursor-paginated using the session `id` as the cursor.
- The server loads no chat history: the worker loads the last 20 Messages into a Direct reply's context.

---

## Redis

Redis access is provided by the **`@nebula-chat/redis`** lib, registered by
`plugins/redis.plugin.ts` and reached through `@server/redis` (`src/redis.ts`). See
[ADR-0009](../../docs/adr/0009-nebula-chat-redis-lib.md). The server uses it for:

- **better-auth's secondary storage** (`authStore`, ADR-0010) and **runtime log levels** (`pubsub`, ADR-0020).
- **Reply streams** (`streams`, ADR-0014): the relay tails a stream over a dedicated connection
  (`openReplyStream`), since a blocking `XREAD` ties its connection up.
- **Stream owners**: `saveStreamOwner` / `findStreamOwner` record who may read a stream
  (`stream-owner:{streamId}`, 24-hour TTL). The assistant Message only exists once the worker finishes it,
  so the owner check cannot go through Postgres.
- **Resume and cancel** (NEB-355): `saveActiveStream` / `findActiveStream` keep each Session's in-flight
  reply (`session-stream:{sessionId}`) for `GET /api/sessions/:id`'s `activeStreamId`; `isStreamExpired`
  reads the worker's `stream-ended:{streamId}` flag against the stream's existence, so an expired stream
  404s while a queued one waits; `requestStreamCancel` raises `stream-cancel:{streamId}` for the worker.
- **The Direct reply queue** (`src/queue.ts`): a BullMQ `Queue` on `redis.dedicatedConnection()`, built on
  first use so nothing that only builds the app (the OpenAPI script, route tests) opens a connection.

The connection is lazy with no offline queue, so a command sent before it is ready is rejected.
`server.ts` therefore calls `redis.connect()` at startup without awaiting it (a failure logs
`redis.connect.failed` while ioredis keeps retrying), and the `authStore` and stream-owner helpers await
that same connect before each command.

**The response cache is off.** The server's cache hooks were removed with the move to the worker
(ADR-0013); caching Direct replies comes back in the worker through the `cache` primitive.

---

## Sending a Message and streaming its reply

The server does no LLM work and holds no LLM keys (ADR-0013): it persists the user's Message, enqueues the
reply for the worker, and relays the reply stream (ADR-0014). The full sequence is in
[docs/architecture.md](../../docs/architecture.md#direct-reply). Specifics worth knowing:

- `POST /api/sessions/:sessionId/messages` answers `202 { messageId, streamId }`. Its chain is rate limit
  (10/60 s per IP) → body validation → `requireAuthentication` → `chat.messageAllowance.hook`
  (403 `MessageAllowanceReached` before anything is persisted) → `chatService.sendMessage`.
- `sendMessage` holds the Message to **2 000** prompt tokens (413), persists it in a transaction, records the
  stream owner in Redis, enqueues IDs only (checked against `@nebula-chat/contracts`), and pings the worker's
  `/health` unawaited. Limits and prices are in the model catalog in `@nebula-chat/contracts` (ADR-0030).
- The catalog is served as `GET /api/models` (public, cached for an hour) with its `version` and `hash`, and `modelIdSchema` derives from it,
  so a Session can only be bound to a Model in the catalog (400 `Validation` otherwise).
- `GET /api/streams/:streamId` checks the owner (another User's stream is a 404), hijacks the reply and
  relays the stream as SSE with `id` = the entry id, a `: keep-alive` comment per idle 15 s, ending after `end`.
- `GET /api/chat/message-allowance` is a plain read that shares `getMessageAllowance` with the hook
  ([docs/auth.md](../../docs/auth.md#reading-the-allowance)).
- SSE events are `ReplyStreamEvent` in `@nebula-chat/contracts`: `token`, `usage`, `error` (the error
  envelope), and `end` (always last). An entry the server cannot parse is skipped, so the contract can grow.

---

## OpenAPI Docs

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

The script (`src/scripts/generate-openapi.ts`) calls `buildApp()` → `app.ready()` → `app.swagger({ yaml: true })` and writes the result. It needs no environment (see [Commands](#commands)).

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

---

## Path Aliases

The backend uses `@server/*` as a path alias for `src/*`:

```ts
import { db } from '@server/db';
import { errorHandler } from '@server/errors/error.handler';
```

Never use relative paths in the backend. Aliases are configured in `tsconfig.json` and resolved at build time by `tsc-alias`.

Static imports stay extensionless. A dynamic `import()` needs a `.js` extension (`await import('@server/app.js')`): under `"module": "node20"` it is emitted as a real ESM import, which resolves like ESM.

---

## Environment Variables

`apps/server/.env` is loaded by package scripts, never by code: `dev`, `start` and the `@nebula-chat/db`
`db:*` scripts wrap their command in `dotenvx run -f <file> --ignore=MISSING_ENV_FILE --`. A variable already set by
the shell, CI or Render wins over the file, and a missing file is silent. `test` and `generate:openapi` deliberately
read no `.env`, so a test run behaves the same on a developer machine as in CI. A new script that needs the file must
be wrapped the same way. See [ADR-0019](../../docs/adr/0019-dotenvx-loads-env-files-in-package-scripts.md).

| Variable                           | Purpose                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `WORKER_URL`                       | The worker's public URL; the server pings its `/health` on every enqueue to wake it (default `http://localhost:3001`)     |
| `STREAM_CANCEL_TTL_SECONDS`        | How long a stop request waits for the worker to see it (default `900`)                                                    |
| `DATABASE_URL`                     | PostgreSQL connection string                                                                                              |
| `REDIS_URL`                        | Redis connection (e.g. `redis://localhost:6380`)                                                                          |
| `CLIENT_URL`                       | Frontend origin for CORS (e.g. `http://localhost:5173`); must be the same site as the API ([auth.md](../../docs/auth.md)) |
| `SERVER_URL`                       | Backend public URL, allowed as a CORS origin alongside `CLIENT_URL` (e.g. for Swagger UI at `/docs`)                      |
| `BETTER_AUTH_SECRET`               | better-auth secret — signs sessions and the session cookie cache (required)                                               |
| `BETTER_AUTH_URL`                  | App base URL for better-auth cookies/redirects (required, e.g. `http://localhost:3000`)                                   |
| `RESEND_API_KEY`                   | Resend API key for the verification and password-reset emails (required; ADR-0021)                                        |
| `EMAIL_FROM`                       | Sender for those emails — `address` or `Name <address>` on a Resend-verified domain (required)                            |
| `GUEST_MESSAGE_ALLOWANCE`          | Guest `user`-message cap before registration is required (int, default `10`; ADR-0010)                                    |
| `GOOGLE_CLIENT_ID`                 | Google OAuth client id for social sign-in. Set with `GOOGLE_CLIENT_SECRET`, or leave both unset to turn Google off        |
| `GOOGLE_CLIENT_SECRET`             | Google OAuth client secret (paired with `GOOGLE_CLIENT_ID`; only one of the two set fails boot)                           |
| `GITHUB_CLIENT_ID`                 | GitHub OAuth app client id for social sign-in. Set with `GITHUB_CLIENT_SECRET`, or leave both unset to turn GitHub off    |
| `GITHUB_CLIENT_SECRET`             | GitHub OAuth app client secret (paired with `GITHUB_CLIENT_ID`; only one of the two set fails boot)                       |
| `PORT`                             | Port to listen on (default `3000`)                                                                                        |
| `LOG_LEVEL`                        | Log verbosity (default `info`; set to `debug`/`warn` etc. in prod)                                                        |
| `LOG_LEVEL_OVERRIDES`              | Per-component levels, comma-separated `component=level` (e.g. `redis=debug,auth=warn`); unknown level fails boot          |
| `OTEL_EXPORTER_OTLP_ENDPOINT`      | OTLP collector URL. Unset = spans are not exported (the tracer still runs, so lines keep their `trace_id`)                |
| `OTEL_LOGS_EXPORTER`               | `otlp` also exports every log line over OTLP (to Loki), given an endpoint. Unset/`none` = stdout only (ADR-0023)          |
| `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | Logs-only OTLP URL, used as is (`…/v1/logs`); unset = logs go to `OTEL_EXPORTER_OTLP_ENDPOINT` + `/v1/logs`               |
| `OTEL_LOG_LEVEL`                   | Verbosity of the OTel SDK's own diagnostics (default `error`; `none`/`warn`/`info`/`debug`/`verbose`/`all`)               |
| `OPERATOR_TOKEN`                   | Shared operator secret (32+ chars) for `/api/internal/*`, e.g. changing log levels at runtime. Unset = those routes 404   |
| `SUPABASE_URL`                     | Supabase project URL for Profile image storage (ADR-0022). Set all three storage vars or none; none = uploads off         |
| `SUPABASE_SECRET_KEY`              | Supabase secret key; server-only, writes the Profile image bucket                                                         |
| `PROFILE_IMAGE_BUCKET`             | Public bucket for Profile images: `profile-images-dev` locally, `profile-images` in production                            |

> **`env.ts` rule:** All env vars are Zod-validated in `src/env.ts` and fail loudly at startup before any listener is bound. Never read `process.env.*` directly anywhere in the backend — always import from `@server/env`. The only code that touches `process.env` is what runs before `env.ts` parses it: `src/test/setup.ts` and `src/scripts/generate-openapi.ts`, which fill placeholders with `??=`.
>
> **One exception:** `@nebula-chat/otel` reads the `OTEL_*` variables (`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_LOGS_EXPORTER`, `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`, `OTEL_LOG_LEVEL`) from `process.env` itself — a published lib can't depend on one consumer's env schema.
> They are still declared in `src/env.ts`. See [ADR-0007](../../docs/adr/0007-otel-lib-and-fastify-native-logger.md) for why, and [docs/logging.md](../../docs/logging.md) for how logging works.

The `BETTER_AUTH_*`, `GUEST_MESSAGE_ALLOWANCE` and `GOOGLE_*`/`GITHUB_*` vars feed `@nebula-chat/auth`. See [docs/auth.md](../../docs/auth.md) for how authentication works (the route gates, the message allowance, and the claim) and [ADR-0010](../../docs/adr/0010-better-auth-for-auth.md) for the decisions behind it.

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
  const res = await app.inject({ method: 'GET', url: '/api/sessions' });
  expect(res.statusCode).toBe(200);
  ```

  This keeps routing, Zod validation, `error.handler.ts` and the `preHandler` hook chain under test. No
  socket is opened and no container is needed.

- **Mock at the nearest boundary to an external system, and nothing above it.** For a CRUD route that
  is the repository: `vi.mock` the `*.repository.ts` module and leave the service and controller real —
  mocking a service to test its own controller tests nothing. The send and stream routes also reach Redis
  and BullMQ, through `@server/redis` (`src/redis.ts`) and `@server/queue` (`src/queue.ts`), so their
  route tests fake those two modules in memory (`src/test/memoryReplyStreams.ts`, an array of enqueued
  jobs). The rule is the same one either way — fake the thing that would otherwise open a socket, keep
  everything between it and the HTTP boundary real — and the faked module gets its own unit test at its
  own seam (`src/tests/redis.test.ts`, `src/tests/queue.test.ts`; the lib's primitives are tested in
  `@nebula-chat/redis`).
- **No database, no Redis, no network.** The CI `DATABASE_URL` secret points at a shared database and is
  off-limits to tests.
- **Test each layer at its seam**: `.validation` (Zod schemas — accept and reject cases), `.service`
  (business logic with the repository mocked), and the route (via `app.inject()`). Cover the error paths
  too: validation failure, not-found, and rate-limited.
- **`AppError` mapping is a seam worth its own tests** — `errors/error.handler.ts` is what every route
  depends on for correct status codes.
