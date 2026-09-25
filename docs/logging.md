# Logging and tracing

How logs and traces work in Nebula Chat, and the conventions every line follows.
For the decisions behind the logger's shape, see
[ADR-0007](./adr/0007-otel-lib-and-fastify-native-logger.md).

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

| Where you are              | Use               | Why                                                         |
| -------------------------- | ----------------- | ----------------------------------------------------------- |
| Inside a request           | `req.log`         | Carries `http.request.id`, and the User once a gate has run |
| No request in scope at all | `@backend/logger` | Startup, shutdown, and the Redis/better-auth singletons     |

The libs never create a logger: `@nebula-chat/redis` and `@nebula-chat/auth` log
only through the one they are given, and `@nebula-chat/langchain` through the
duck-typed `LLMLogger` it is handed per call.

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

Log an error under **`err`**, never `error`. Pino's error serializer runs only for
`err`; `{ error: err.message }` throws away the stack and the cause. ESLint
rejects an `error` key in a log call's object across the backend packages.

## The attribute catalogue

| Concern   | Keys                                                                                                                                                                                     |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service   | `service.name`, `service.version`, `deployment.environment.name`, `pid` (base fields); no `hostname`                                                                                     |
| Request   | `http.request.method`, `url.path` (no query string), `http.route`, `http.response.status_code`, `http.request.id`, `server.address`, `server.port`                                       |
| Error     | `err` (object; `err.type` is the class name), `error.type` (the classification: the `AppError` code, `Internal` when unclassified)                                                       |
| LLM       | `gen_ai.provider.name`, `gen_ai.request.model`, `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`                                                                                |
| User      | `user.id`, `nebula.user.kind` (`guest` \| `registered`)                                                                                                                                  |
| Domain    | `nebula.session.id`, `nebula.message.id`, `nebula.reply.message.id`, `nebula.run.id`, `nebula.step.id`, `nebula.agent.name`, `nebula.job.id`, `nebula.cache.key`, `nebula.cache.pattern` |
| Subsystem | `nebula.component` (`auth`, `chat`, `http`, `llm`, `otel`, `redis`)                                                                                                                      |
| Outcome   | `nebula.duration_ms`, `nebula.outcome`                                                                                                                                                   |
| Trace     | `trace_id`, `span_id`                                                                                                                                                                    |
| Adapters  | `args` (a third-party logger's extra arguments)                                                                                                                                          |

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

## Never logged

Message content, prompts, completions, Streaming tokens, emails, names,
cookies, `Authorization` headers and API keys. Opaque ids are fine.

The catalogue already keeps these out of `logEvent`. As a second line of
defence, `createLogger` censors (`[Redacted]`) credential and content-bearing
keys at any of the first three nesting depths (`req.headers.cookie`,
`config.apiKey`, `args[0].email`) plus their flat dotted forms
(`"http.request.header.authorization"`, `"user.email"`). Pino redact paths use
dots for _nesting_, so a flat dotted key needs bracket notation
(`["user.email"]`) to match at all. The list lives in
[`libs/otel/src/redaction.ts`](../libs/otel/src/redaction.ts).

## Development format

In development, `pino-pretty` renders `event.name · msg` as the headline and
hides the service fields and `pid`:

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
every span, and with metrics and log exporting pinned to nothing. Both matter:
with zero span processors `NodeSDK` installs no tracer provider, so spans stay
non-recording and no line gets a `trace_id`; and with those options simply left
out, it falls back to env-driven OTLP exporters pointed at localhost.

`trace_id`/`span_id` come from a Pino `mixin` that reads the active span through
`@opentelemetry/api` at write time. Not from `@opentelemetry/instrumentation-pino`,
which is disabled: Pino is loaded through `@nebula-chat/otel` _before_
`initTelemetry` runs, so that instrumentation could never patch it, and it could
only add duplicate keys or ship logs over OTLP. stdout JSON is the log sink.

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
dev lines carry no `trace_id`. The compiled build (`pnpm build && pnpm start`)
is instrumented. Use it when you need traces locally.

### Local development

`docker-compose.yml` runs `grafana/otel-lgtm`, which accepts OTLP directly — no
Collector needed — and bundles Grafana and Tempo:

```bash
docker compose up -d otel-lgtm
```

Then set `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` in
`apps/nebula-chat-server/.env`, run the compiled server, and open Grafana at
<http://localhost:3001> (3001, because the server itself uses 3000). A line's
`trace_id` is the id to search for in Tempo.

### Production

Nothing to deploy. The app speaks plain OTLP, so you point it at a hosted
endpoint and set the auth header — no Collector, no sidecar:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=<vendor OTLP endpoint>
OTEL_EXPORTER_OTLP_HEADERS=<vendor auth header>
```

The exporter is constructed with no arguments and reads those standard `OTEL_*`
vars itself, so switching vendors needs no code change. The intended target is
Grafana Cloud's free tier, which is hard-capped rather than overage-billed.

Two caveats on Render's free plan: the service sleeps when idle, so traces exist
only while it is awake; and export is gated on `OTEL_EXPORTER_OTLP_ENDPOINT`
specifically — setting only the more specific
`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` exports nothing.

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
- **`@nebula-chat/redis` failures carry no request context.** The lib logs
  through the logger `src/redis.ts` built it with at startup, so a
  `cache.*.failed` line has no `http.request.id` or `user.id`. The server's own
  cache lines (`cache.hit`, `cache.saved`, `cache.check.failed`) are written
  through `req.log` and carry both.
- **Drizzle query logging is off.** The db client passes no `logger` option, so
  SQL is never logged. Wiring it to Pino is a reasonable follow-up ticket.
- **No metrics.** Traces and logs only. `@fastify/under-pressure` exposes
  event-loop health in the meantime.
- **Levels are fixed at boot.** Changing `LOG_LEVEL` or `LOG_LEVEL_OVERRIDES`
  needs a restart.
