# Logging and tracing

How logs and traces work in Nebula Chat, and the conventions every line follows.
For the decisions behind them, see
[ADR-0017](./adr/0017-structured-logging-conventions.md) (the conventions) and
[ADR-0007](./adr/0007-otel-lib-and-fastify-native-logger.md) (one logger, no
`pino-http`).

## The short version

- Every logger comes from `createLogger()` in `@nebula-chat/otel`. Inside a
  request you use `req.log`; outside one you import `@backend/logger`. You
  never call `console.*`.
- Every line is written with `logEvent(logger, level, event, attributes, msg)`:
  a stable `event.name`, a human `msg`, and flat dotted attributes from a typed
  catalogue. An unknown event or attribute key does not compile.
- An error is logged **once, by whoever handles it**, under `err`.
- Each unit of work writes **one** summary line at `info`. Progress inside it is
  `debug`.
- Lines go to stdout, and also to Loki over OTLP when `OTEL_LOGS_EXPORTER=otlp`
  ([Exporting logs](#exporting-logs)). Grafana links them to their traces.

## What a line looks like

```json
{
  "level": 30,
  "time": 1790344183786,
  "service.name": "nebula-chat-server",
  "service.version": "1.13.1",
  "deployment.environment.name": "production",
  "pid": 14328,
  "http.request.id": "req-1",
  "user.id": "9f1c…",
  "nebula.user.kind": "guest",
  "nebula.component": "http",
  "trace_id": "9f453fd8e3035b315ee828354d55bd58",
  "span_id": "d59ebb6660ee6d35",
  "event.name": "http.request.completed",
  "http.request.method": "GET",
  "url.path": "/api/conversations",
  "http.route": "/api/conversations",
  "http.response.status_code": 200,
  "nebula.duration_ms": 5.06,
  "msg": "GET /api/conversations 200 · 5.06 ms"
}
```

- **`event.name`** is a stable dotted identifier. Filter and alert on it, never
  on `msg`.
- **`msg`** is for people. It may include values:
  `Direct reply completed · gpt-4o-mini · 1234 tokens · 3.2 s`.
- **Attribute keys are flat dotted strings** (`"user.id"`), never nested
  objects. Pino does not deep-merge, so a bound `user: {…}` plus a call-site
  `user: {…}` would emit a duplicate JSON key.
- **The one nested value is `err`.** It stays an object so the serializer can
  emit its `type`, `message`, `stack` and `cause`. A thrown non-Error (a bare
  string) is still emitted as `{ type, message }`.
- **Every line carries the service fields**: `service.name`, `service.version`,
  `deployment.environment.name` and `pid`. There is no `hostname`.
- **Every line written inside a span carries `trace_id` and `span_id`**, stamped
  by a mixin in `createLogger` (see [Tracing](#tracing)).

## Where lines come from

There is **one Pino instance** on the server's runtime path, created in
[`apps/nebula-chat-server/src/logger.ts`](../apps/nebula-chat-server/src/logger.ts):

```ts
export const logger: Logger = createLogger({
  serviceName: 'nebula-chat-server',
  serviceVersion: version, // from the server's package.json
  environment: env.NODE_ENV,
  level: env.LOG_LEVEL,
  levelOverrides: env.LOG_LEVEL_OVERRIDES,
  pretty: env.NODE_ENV === 'development',
});
```

`serviceName` is required: a line that cannot say who wrote it is noise.
`server.ts` hands this instance to `initTelemetry` and to
`buildApp({ logger })`, which passes it to Fastify's `loggerInstance`. So
`app.log`, every `req.log`, and every import of `@backend/logger` share it.

| Where you are              | Use               | Why                                                              |
| -------------------------- | ----------------- | ---------------------------------------------------------------- |
| Inside a request           | `req.log`         | Carries `http.request.id`, and the User once a gate has run      |
| No request in scope at all | `@backend/logger` | Startup, shutdown, and the Redis/Postgres/better-auth singletons |

The libs never create a logger: `@nebula-chat/redis`, `@nebula-chat/db` and
`@nebula-chat/auth` log only through the one they are given, and
`@nebula-chat/langchain` through the duck-typed `LLMLogger` it is handed per
call.

## Writing a line

```ts
import { componentLogger, logEvent } from '@nebula-chat/otel';

logEvent(
  componentLogger(req.log, 'redis'),
  'warn',
  'cache.check.failed',
  { err: error },
  'Cache check failed; calling the model instead',
);
```

- **`logEvent`** writes `event.name` plus the attributes. The event name comes
  from [`libs/otel/src/events.ts`](../libs/otel/src/events.ts) and the keys
  from [`libs/otel/src/attributes.ts`](../libs/otel/src/attributes.ts). A name
  or key missing from either is a compile error — even in a variable, not just
  in an object literal. Add new ones there; never repurpose an existing name,
  since someone may be querying it.
- **An attribute whose value is `undefined` is dropped**, so "when it exists"
  needs no conditional spread.
- **`bindAttributes(logger, attributes)`** is the type-checked
  `logger.child(...)`: context that applies to many lines (the User, the
  Session) is bound once on a child rather than repeated per call.
- **`componentLogger(logger, name)`** binds `nebula.component` and applies that
  component's level override. Derive it from a logger that has no component
  yet: a second binding would emit the key twice.

A few lines come from code we don't own. **Stamped adapters** give them the same
shape by binding `event.name` on a child logger instead of calling `logEvent`:

- better-auth's lines become `auth.library.log`, and the OTel SDK's diagnostics
  `otel.diag.log`. Both keep the library's own text as `msg` and gather any
  extra arguments under `args`.
- Fastify's remaining framework-fault lines become `fastify.log`, with our own
  `msg` and the error as `err` (see [Request logging](#request-logging)).
- `@nebula-chat/langchain` writes `llm.stream.started`/`llm.stream.finished` and
  its `gen_ai.*` keys by hand. It does not depend on `@nebula-chat/otel`, so
  those names are not type-checked; NEB-358 dissolves the lib into the worker.

## Levels

| Level   | Meaning                                              | Examples                                                                      |
| ------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| `fatal` | The process is about to exit                         | `server.start.failed`                                                         |
| `error` | Something failed and a human should look             | a 5xx, a failed reply, an unexpected exception                                |
| `warn`  | Degraded but handled; the user is unaffected or told | a fail-open cache failure, a rate-limited reply, an OTel start failure        |
| `info`  | One summary per unit of work, plus lifecycle         | `http.request.completed`, `chat.reply.completed`, `server.started`            |
| `debug` | Progress inside a unit                               | `http.request.received`, `llm.stream.started`/`finished`, `cache.hit`/`saved` |
| `trace` | Per-chunk detail                                     | — (nothing logs per Streaming token today)                                    |

## Log once, where it is handled

Code that throws does not also log. The handler that catches the error logs it,
once, and nobody else does:

- **HTTP.** `errors/error.handler.ts` classifies first. A 5xx writes one `error`
  line, `http.request.failed`, with the thrown error as `err` and its code as
  `error.type` (`Internal` for anything unclassified). A 4xx writes **nothing**:
  the caller was told, and it is not a fault. Either way the code is recorded,
  so the request's `http.request.completed` line names it as `error.type`
  (`NotFound`, `Validation`, …). A Postgres constraint violation mapped to
  `Conflict` or `Validation` keeps the driver error as its `cause`.
- **Auth.** The `/api/auth/*` catch-all hijacks its reply, so a throw from
  better-auth's handler skips the error handler. The route writes the same
  `http.request.failed` line (`error.type: Internal`) and records the code.
- **Chat.** The SSE stream hijacks its reply, so `chat.service` is its own
  handler. `@nebula-chat/langchain`'s `streamChat` rethrows without logging, and
  the service writes exactly one `chat.reply.completed` per Direct reply:

  | `nebula.outcome` | Level                                                     | Carries                       |
  | ---------------- | --------------------------------------------------------- | ----------------------------- |
  | `completed`      | `info`                                                    | tokens, both message ids      |
  | `rate_limited`   | `warn`                                                    | `error.type: TooManyRequests` |
  | `failed`         | `error`, or `warn` when the caller caused it (a 4xx code) | `err`, `error.type`           |

  Every outcome also carries `nebula.session.id` (once known), the user Message
  as `nebula.message.id`, the assistant Message as `nebula.reply.message.id`
  (when one was created), `gen_ai.*`, and `nebula.duration_ms`. A reply replayed
  from the cache is still a Direct reply: `chat.cacheCheck.hook.ts` writes its
  `completed` line, marked by `nebula.cache.key`.

- **Cache.** Every cache operation is fail-open, so a Redis failure is a `warn`
  (`cache.read.failed`, `cache.write.failed`, `cache.delete.failed`,
  `cache.clear.failed`, `cache.check.failed`, `cache.capture.failed`) with `err`
  and the key or pattern. A cached token line that cannot be parsed is skipped
  with a `cache.entry.unparseable` warning.
- **Profile image storage.** A replaced or removed Profile image's file is
  deleted after the user is saved, so a failed delete never fails the request:
  it is a `warn`, `profile_image.delete.failed` with `err` and
  `nebula.profile_image.key`. Removing an uploaded image while no storage is
  configured leaves its file behind, logged as `profile_image.orphaned`.
- **Redis connection.** `@nebula-chat/redis` listens for ioredis's `error`
  event, which fires on every failed (re)connect, so nothing reaches
  `console.error`. The first failure of an outage is one `error` line,
  `redis.connection.failed` with `err`. Every retry after it logs the same event
  at `debug` (`LOG_LEVEL_OVERRIDES=redis=debug` shows them). Reconnecting logs
  `redis.connection.restored` at `info`, with the outage length as
  `nebula.duration_ms`.
- **Postgres pool.** When Postgres drops an idle pooled connection (a restart,
  a failover, `pg_terminate_backend`), `pg` emits `error` on the pool; with no
  listener that would exit the process. `@nebula-chat/db` listens and logs one
  `error` line per dropped connection, `db.connection.failed` with `err`. The
  pool has already discarded that client and opens a new one on the next query.
  A query made while Postgres is down fails on its own, so its request answers
  5xx; the process stays up and recovers once Postgres is back.

Log an error under **`err`**, never `error`. Pino's error serializer runs only for
`err`; `{ error: err.message }` throws away the stack and the cause. ESLint
rejects an `error` key in a log call's object across the backend packages.

## The attribute catalogue

| Concern     | Keys                                                                                                                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service     | `service.name`, `service.version`, `deployment.environment.name`, `pid` (base fields); no `hostname`                                                                                                                 |
| Request     | `http.request.method`, `url.path` (no query string, path tokens redacted), `http.route`, `http.response.status_code`, `http.request.id`, `server.address`, `server.port`                                             |
| Error       | `err` (object; `err.type` is the class name), `error.type` (the classification: the `AppError` code, `Internal` when unclassified)                                                                                   |
| LLM         | `gen_ai.provider.name`, `gen_ai.request.model`, `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`                                                                                                            |
| User        | `user.id`, `nebula.user.kind` (`guest` \| `registered`)                                                                                                                                                              |
| Domain      | `nebula.session.id`, `nebula.message.id`, `nebula.reply.message.id`, `nebula.run.id`, `nebula.step.id`, `nebula.agent.name`, `nebula.job.id`, `nebula.cache.key`, `nebula.cache.pattern`, `nebula.profile_image.key` |
| Subsystem   | `nebula.component` (`auth`, `chat`, `http`, `llm`, `otel`, `redis`)                                                                                                                                                  |
| Log control | `nebula.log.target` (`root` or a component), `nebula.log.level.from`, `nebula.log.level.to`, `nebula.log.level.expires_at`, `nebula.operator`                                                                        |
| Outcome     | `nebula.duration_ms`, `nebula.outcome`                                                                                                                                                                               |
| Trace       | `trace_id`, `span_id`                                                                                                                                                                                                |
| Adapters    | `args` (a third-party logger's extra arguments)                                                                                                                                                                      |

Keys follow [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/specs/semconv/)
where one exists, and `nebula.*` for domain concepts.

The Session is **`nebula.session.id`**, never bare `session.id`, even though the
code variable is still `conversationId`. OTel's `session.id` means a client
browsing session, and the codebase already has a separate _auth session_.

## Context: who, which Session, which trace

- **The request.** Fastify generates the request id and binds it on `req.log` as
  `http.request.id` (its `logController` sets the label).
- **The User.** Once `requireAuthentication`/`requireRegistered` resolves the
  auth session, it rebinds the request's loggers with `user.id` and
  `nebula.user.kind`. It rebinds **both** `req.log` and `reply.log`: Fastify
  copies `request.log` onto `reply.log` when the reply is created, and the error
  handler and the completion line write through the reply.
- **The Session.** `chat.service` binds `nebula.session.id` once the
  conversation id is known (a new one only gets its id mid-request), and hands
  the LLM call a child bound to it, so `llm.stream.*` lines carry it too.
- **The trace.** See [Tracing](#tracing).

## Request logging

Fastify's own `incoming request`/`request completed` lines are off. Instead,
[`plugins/requestLogging.plugin.ts`](../apps/nebula-chat-server/src/plugins/requestLogging.plugin.ts)
adds two root-level hooks, so every route is covered:

- `onRequest` writes `http.request.received` at `debug`.
- `onResponse` writes **the one `info` line per request**,
  `http.request.completed`, with the method, path, route, status,
  `nebula.duration_ms` and, for a failed request, `error.type`.

`onResponse` fires on the raw response's `finish`, so it runs for hijacked
replies too. The SSE chat route gets an `http.request.completed` line (status
`200`, since the stream started) **and** its `chat.reply.completed`, which is
where the reply's real outcome lives. The same goes for the better-auth
catch-all.

Request logging is switched off through Fastify's `logController` option (in
[`utils/logController.ts`](../apps/nebula-chat-server/src/utils/logController.ts)),
not the deprecated top-level `disableRequestLogging`. Switching it off would also
silence Fastify's framework-fault lines (a failing serializer, a stream error
after the headers), so the controller rewrites those as `fastify.log` instead.

**Never add `pino-http` or a Fastify logger plugin.** It logs every request twice
under two independent request-id schemes.

`app.listen()` writes its own "Server listening at …" line through `app.log`
with no option to turn it off. `server.ts` points `app.log` at a silent child for
the duration of the call, and writes `server.started` instead.

## Per-component levels

`LOG_LEVEL` (default `info`) is the root level. `LOG_LEVEL_OVERRIDES` raises or
lowers one `nebula.component` without touching the rest:

```bash
# see every cache hit, save and failure; keep better-auth to warnings
LOG_LEVEL_OVERRIDES=redis=debug,auth=warn pnpm --filter nebula-chat-server dev
```

It is comma-separated `component=level` pairs. `silent` mutes a component. An
unknown level fails env parsing at boot; a component name no logger uses is
inert. An override may sit **below** the root level: Pino filters per logger
instance, not at the destination, so a `debug` component under an `info` root
still writes its `debug` lines.

`OTEL_LOG_LEVEL` works the same way for the SDK's own diagnostics. It is
independent of both.

## Changing levels at runtime

On Render, changing an env var means a redeploy, and the restart often hides the
problem you wanted `debug` lines for. An operator can instead change the root
level, or one component's, on every running server instance at once, and the
change reverts on its own ([ADR-0020](./adr/0020-runtime-log-level-switching.md)):

```bash
curl -X POST "$SERVER_URL/api/internal/log-level" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" -H 'Content-Type: application/json' \
  -d '{"component":"redis","level":"debug","ttlSeconds":900,"operator":"ada"}'
# 202 {"receivers":2,"expiresAt":"2026-10-02T09:15:00.000Z"}
```

- **Body.** `level` is one of the six levels. `component` is optional: omit it to
  change the root level. `ttlSeconds` defaults to 15 minutes, at most 4 hours.
  `operator` names who is asking.
- **Auth.** Only `Authorization: Bearer <OPERATOR_TOKEN>` gets through. A Guest
  or Registered user's session counts for nothing: `403 Forbidden`. With
  `OPERATOR_TOKEN` unset the route answers `404`, as if it did not exist.
- **Reach.** The route publishes on the Redis pub/sub channel
  `log-level:nebula-chat-server`. Every instance subscribes at boot and applies
  what arrives. `receivers` is how many instances got it; `0` means none was
  listening.
- **Record.** Each instance writes `log.level.changed` (target, from, to,
  `expires_at`, operator) and, on expiry, `log.level.reverted`. Both are `info`
  lines that bypass the level being changed, so a switch to `error` is still
  recorded.
- **Expiry.** The boot-time level (`LOG_LEVEL` / `LOG_LEVEL_OVERRIDES`) comes
  back after `ttlSeconds`. Changing the same target again restarts its expiry;
  the root and each component expire independently.

The route is in the OpenAPI spec (Swagger UI at `/docs`, tag `Operator`, which
`orval.config.ts` leaves out of the browser client).

In code, `changeLogLevel(logger, change)` from `@nebula-chat/otel` does the
in-process part. `listenForLogLevelChanges` and `publishLogLevelChange` carry it
over any pub/sub with `@nebula-chat/redis`'s `pubsub` shape. A new process (the
worker, NEB-354) listens with one call next to its `createLogger`.

## Never logged

Message content, prompts, completions, Streaming tokens, emails, names,
cookies, `Authorization` headers and API keys. Opaque ids are fine.

The one name that is logged is `nebula.operator`: what an Operator calls
themselves on a runtime level change. Use a handle, not a full name.

The catalogue already keeps these out of `logEvent`. As a second line of
defence, `createLogger` censors (`[Redacted]`) credential and content-bearing
keys at any of the first three nesting depths (`req.headers.cookie`,
`config.apiKey`, `args[0].email`) plus their flat dotted forms
(`"http.request.header.authorization"`, `"user.email"`). Pino redact paths use
dots for _nesting_, so a flat dotted key needs bracket notation
(`["user.email"]`) to match at all. The list lives in
[`libs/otel/src/redaction.ts`](../libs/otel/src/redaction.ts).

Key-based redaction cannot reach a token inside a value, so `url.path` is
cleaned before it is logged
([`requestPath.ts`](../apps/nebula-chat-server/src/utils/requestPath.ts)): the
query string is dropped, and a token carried as a path segment is replaced with
`[Redacted]`, e.g. `/api/auth/reset-password/[Redacted]`. A new route with a
token in its path adds one pattern there.

## Development format

In development, `pino-pretty` renders `event.name · msg` as the headline and
hides the service fields and `pid`. The timestamp is local time, the same clock
`tsx watch` uses for its restart line. The JSON `time` field stays epoch ms:

```text
[13:50:04] INFO: http.request.completed · GET /nope 404 NotFound · 0.55 ms
    http.request.id: "req-2"
    nebula.component: "http"
    url.path: "/nope"
    error.type: "NotFound"
```

## Tracing

`initTelemetry('nebula-chat-server')` starts the OpenTelemetry Node SDK with
auto-instrumentation for HTTP, Postgres and Redis. **The tracer is always on.**
`OTEL_EXPORTER_OTLP_ENDPOINT` decides only whether spans are _exported_:

| Variable                      | Effect                                                                  |
| ----------------------------- | ----------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Where to send spans. Unset = spans are created (and logged) but dropped |
| `OTEL_LOG_LEVEL`              | Verbosity of the SDK's _own_ diagnostics (default `error`)              |

With the endpoint unset, the SDK starts with a span processor that discards
every span, and with metrics exporting pinned to nothing. Both matter: with zero
span processors `NodeSDK` installs no tracer provider, so spans stay
non-recording and no line gets a `trace_id`; and with those options simply left
out, it falls back to env-driven OTLP exporters pointed at localhost. Log
exporting is always set explicitly, and is on only when opted into (see
[Exporting logs](#exporting-logs)).

`trace_id`/`span_id` come from a Pino `mixin` that reads the active span through
`@opentelemetry/api` at write time. Not from `@opentelemetry/instrumentation-pino`,
which is disabled: Pino is loaded through `@nebula-chat/otel` _before_
`initTelemetry` runs, so that instrumentation could never patch it, and it could
only add duplicate keys. stdout JSON stays the source of truth; exporting logs
over OTLP is a second destination next to it (see [Exporting logs](#exporting-logs)).

### The import-ordering trap

Auto-instrumentation patches modules as they load, so anything imported _before_
`initTelemetry` runs is never instrumented. In `server.ts` only
`@nebula-chat/otel`, `@backend/env` and `@backend/logger` sit above the call,
none of them an instrumentation target; `@backend/app` with its
`http`/`pg`/`redis` graph sits below it.

**This works only because the server compiles to CommonJS**, where TypeScript
emits each `import` as a `require` in source position. Under real ESM every
import hoists and the ordering silently stops working — no error, just no
spans. If the server ever moves to ESM, `initTelemetry` has to move into its own
first-imported module. Don't let an import sorter reorder that file.

The same trap bites `pnpm dev` today: under `tsx` nothing is instrumented, so
dev lines carry no `trace_id`, and no request spans reach Tempo. Logs are still
exported, just without a trace to link to. The compiled build
(`pnpm build && pnpm start`) is instrumented. Use it when you need traces locally.

### Shutdown

`shutdownTelemetry()` flushes pending spans (and exported log records) and stops the SDK. It is idempotent:
the lib's own `SIGTERM` hook and the server's shutdown sequence (`src/shutdown.ts`)
share one flush. It never rejects, and it stops waiting after a fixed 2s
(`SHUTDOWN_FLUSH_CAP_MS`). A reachable collector finishes well within that. An
unreachable one makes the exporter retry for about 8s, which would hold the
process open and delay every `tsx watch` restart, since tsx waits for the old
process to exit. A flush that fails or is cut off is reported by the SDK through
`otel.diag.log`. The server awaits the flush alongside `app.close()` and then
exits.

### If tracing seems broken

The SDK reports its own failures through OpenTelemetry's `diag` channel, which is
routed into Pino as `event.name: otel.diag.log` from `nebula.component: otel`,
rather than to the console. So:

```bash
# see what the SDK itself is complaining about
OTEL_LOG_LEVEL=debug pnpm --filter nebula-chat-server start
```

A failed `sdk.start()` logs `otel.start.failed` at `warn` and leaves the server
running without tracing: observability never takes the service down.

## Exporting logs

Every line can also go over OTLP to a log backend: Grafana Cloud Loki in
production, the `otel-lgtm` container locally. stdout JSON stays the source of
truth, and export is **opt-in**
([ADR-0023](./adr/0023-otlp-log-export-through-the-logs-sdk.md)):

| Variable                           | Effect                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| `OTEL_LOGS_EXPORTER`               | `otlp` turns export on. Unset or `none` = stdout only                                  |
| `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | Where to send logs instead: the full URL, used as is (`http://localhost:4318/v1/logs`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT`      | The shared endpoint (as for traces); logs go to its `/v1/logs` when the above is unset |

Both an opt-in and an endpoint are needed. Unlike the OTel default,
`OTEL_LOGS_EXPORTER` unset means off: an endpoint set for traces does not start
spending log quota. With export off there is no exporter, no connection, and
stdout is byte-for-byte what it was.

How it works: `createLogger` writes to a Pino multistream, stdout first, then a
destination that hands each serialized line to the OpenTelemetry logs SDK, which
`initTelemetry` registers and batches over OTLP. Because it takes the serialized
line:

- **Redaction applies to the export too.** A censored key is `[Redacted]` in Loki.
- **The record links to its trace.** It carries the active span the
  `trace_id`/`span_id` mixin stamped, as OTLP trace context.
- **The line keeps its shape.** `msg` is the body, the level the severity
  (`info` → `INFO`, severity text `info`), `time` the timestamp. Every other key
  is an attribute, `event.name` and `err` (as a nested map) included. Left out:
  `trace_id`/`span_id` (the record's trace context), and `service.name` and `pid`,
  which the resource carries with the process and host attributes.

Two kinds of line stay on stdout only:

- **The export pipeline's own**, anything from `nebula.component: otel`
  (`otel.started`, `otel.diag.log`, `otel.start.failed`, the lines below). Exported, every failed
  export would write a line that becomes the next failed export.
- **Lines written before `initTelemetry`.** None today.

A backend that is down, refuses a batch or does not answer within 15 seconds
never blocks or fails a request. The first failed batch writes one `warn`,
`otel.log_export.failed` with `err`; the first batch delivered after it writes
`otel.log_export.restored` at `info`. Batches lost in between are on stdout only.

**Volume.** An exported line comes to about 1.4 KB in Loki once structured
metadata is counted. Grafana Cloud's free tier caps logs at 50 GB a month,
around 35 million lines or 13 a second sustained, against roughly one `info`
line per request today. A runtime switch to `debug` (see
[Changing levels at runtime](#changing-levels-at-runtime)) multiplies that while
it lasts.

## Reading it in Grafana

### Locally

`docker-compose.yml` runs `grafana/otel-lgtm`, which accepts OTLP directly — no
Collector needed — and bundles Grafana, Tempo and Loki, with the datasources
already linking a trace to its log lines and back:

```bash
podman compose up -d otel-lgtm
```

Then in `apps/nebula-chat-server/.env` set:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_LOGS_EXPORTER=otlp
```

Run the compiled server, `pnpm --filter nebula-chat-server start` (which loads
that file); `pnpm dev` exports logs but no traces (see
[the import-ordering trap](#the-import-ordering-trap)).

On boot the server writes one `otel.started` line saying what it exports and
where, e.g. `Exporting traces and logs over OTLP to http://localhost:4318`. No
such line means nothing leaves the process: the two variables are still
commented out, or `libs/otel` is an old build (`pnpm build:libs` after pulling).
`logs stay on stdout` means `OTEL_LOGS_EXPORTER=otlp` is missing.

The compose file sets `GF_PLUGINS_PREINSTALL_AUTO_UPDATE=false`. With internet
access, Grafana 13 otherwise stops its bundled Loki, Tempo and Prometheus plugins
to update them, fails to write the update in the hardened container, and never
starts them again ([grafana/grafana#132528](https://github.com/grafana/grafana/issues/132528)):
the dashboard's **Logs** and **Traces** pickers come up empty.

Open Grafana at <http://localhost:3001> (3001, because the server itself uses
3000):

- **Nebula Chat · Server** opens as the home page, provisioned from the repo
  (see [The dashboard](#the-dashboard)); it is also under **Dashboards → Nebula
  Chat**. You are an anonymous admin, so there is no login. Grafana's own
  welcome page is skipped because its per-user panels answer an anonymous
  visitor with an "Unauthorized" toast.
- **Explore → Tempo**: open a trace, then **Logs for this span** for its lines in
  Loki.
- **Explore → Loki**: open a line; its `trace_id` links to the trace in Tempo.

### In production

Nothing to deploy. The app speaks plain OTLP, so you point it at a hosted
endpoint and set the auth header — no Collector, no sidecar. On Render:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=<vendor OTLP endpoint>
OTEL_EXPORTER_OTLP_HEADERS=<vendor auth header>
OTEL_LOGS_EXPORTER=otlp   # leave unset to export traces only
```

The exporters are constructed with no arguments and read those standard
`OTEL_*` vars themselves, so switching vendors needs no code change. The target
is Grafana Cloud's free tier, which is hard-capped rather than overage-billed:
its OTLP gateway takes traces and logs at the one endpoint.

The dashboard deploys itself. On every push to `main` that changes
`grafana/dashboards/`, the
[`deploy-grafana-dashboards.yml`](../.github/workflows/deploy-grafana-dashboards.yml)
workflow uploads each JSON there to Grafana Cloud by `uid`, overwriting the
existing dashboard in place; run it from the Actions tab for an on-demand
upload. Its datasources are variables, so it picks the stack's logs and traces
datasources without editing. One-time setup before the first run:

- In Grafana Cloud, **Administration → Users and access → Service accounts**:
  create a service account with the **Editor** role (it writes dashboards) and
  add a token to it.
- In the GitHub repository settings, store that token as the
  `GRAFANA_API_TOKEN` secret and set the `GRAFANA_URL` variable to the stack URL
  (`https://<stack>.grafana.net`). An optional `GRAFANA_FOLDER_UID` variable
  targets a folder; without it the dashboard lands in General.

This token is not the OTLP token in `OTEL_EXPORTER_OTLP_HEADERS`; never reuse
one for the other, and never paste either into an issue, PR or chat.

If a trace's **Logs for this span** finds nothing, give the stack's Tempo
datasource the settings `otel-lgtm` ships with: under **Trace to logs**, the logs
datasource, the tag `service.name` mapped to `service_name`, and the query
`{${__tags}} | trace_id = "${__trace.traceId}"`.

Two caveats on Render's free plan: the service sleeps when idle, so telemetry
exists only while it is awake; and span export is gated on
`OTEL_EXPORTER_OTLP_ENDPOINT` specifically — setting only the more specific
`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` exports no spans.

### Querying logs

Loki stores each exported line's attributes as structured metadata, with dots
turned into underscores: `event.name` is `event_name`, `http.response.status_code`
is `http_response_status_code`. Only `service_name` is a stream label, so every
query starts from it:

```logql
{service_name="nebula-chat-server"} | event_name="chat.reply.completed" | nebula_outcome="failed"

sum by (http_route) (count_over_time({service_name="nebula-chat-server"} | event_name="http.request.completed" [5m]))

quantile_over_time(0.95, {service_name="nebula-chat-server"} | event_name="http.request.completed" | unwrap nebula_duration_ms [5m]) by (service_name)
```

The level is `severity_text` (`info`, `warn`, …). A line filter (`|= "…"`)
searches `msg` only; filter attributes by name instead.

### The dashboard

`grafana/dashboards/nebula-chat-server.json` reads the server's logs and traces:
request rate, 5xx rate and latency per route; Direct replies by outcome, tokens
and duration per model; lines by level, warnings and errors by event, the log
lines themselves; and failed and slow traces. Server starts are annotations.
Every panel is LogQL or TraceQL, so it needs no metrics.

The same JSON runs locally and in Grafana Cloud because no panel names a
datasource: they use the **Logs** and **Traces** variables, which default to
the instance's Loki and Tempo. **Service** defaults to _All_ (`.+`): with a
single service picked before Loki holds any of its lines, every query would be
`{service_name=~""}`, which Loki rejects, so each panel would show an error
instead of "No data". Keep it that way when editing:

1. Edit it in local Grafana; the provisioning allows saving from the UI.
2. **Export → Export as code**. Under _Advanced options_ pick the **Classic**
   model and **JSON**, and leave _Share dashboard with another instance_ off, so
   the datasource variables stay variables.
3. Save it over the file in `grafana/dashboards/`. Local Grafana reloads it
   within 10 seconds; merging it to `main` uploads it to Grafana Cloud (see
   "In production").

## Deliberately outside this pipeline

Three things do not go through Pino, on purpose. Don't "fix" them:

- **`libs/db` migration scripts** — `migrate.ts` and `baseline.ts` use
  `console.log`. They are CLI tools run by a human via `pnpm db:migrate`;
  structured JSON would be worse than plain text for that audience.
- **`generate-openapi.ts`** — writes with `process.stdout.write` /
  `process.stderr.write`, same reasoning.
- **The frontend** — browser logging is a separate concern entirely.

## Known gaps

- **No traces under `tsx`.** See [the import-ordering trap](#the-import-ordering-trap).
  Exported logs from `pnpm dev` have no trace to link to.
- **SDK diagnostics are not in Loki.** `otel.diag.log` and the other `otel`
  component lines stay on stdout (see [Exporting logs](#exporting-logs)).
- **`@nebula-chat/redis` failures carry no request context.** The lib logs
  through the logger `src/redis.ts` built it with at startup, so a
  `cache.*.failed` line has no `http.request.id` or `user.id`. The server's own
  cache lines (`cache.hit`, `cache.saved`, `cache.check.failed`) are written
  through `req.log` and carry both.
- **Drizzle query logging is off.** `createDbClient` gives Drizzle no `logger`
  option, so SQL is never logged. Wiring it to Pino is a reasonable follow-up
  ticket.
- **No metrics.** Traces and logs only; the dashboard derives its rates and
  percentiles from log lines. `@fastify/under-pressure` exposes event-loop health
  in the meantime.
- **A runtime level change is fire-and-forget.** Redis pub/sub keeps nothing,
  so an instance that starts, or reconnects to Redis, after the change was sent
  never gets it, and a restart drops it. An instance that boots while Redis is
  down subscribes once Redis is back, and misses changes until then. `receivers`
  shows how many got it; send it again if that is short.
- **A root change reaches requests from the next one on.** Fastify fixes a
  request logger's level when the request starts. A component change reaches
  in-flight requests at once.
