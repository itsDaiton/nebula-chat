# Logging and tracing

How logs and traces actually work in Nebula Chat. For the decisions behind this
shape, see [ADR-0007](./adr/0007-otel-lib-and-fastify-native-logger.md).

> **Being revised.** [ADR-0017](./adr/0017-structured-logging-conventions.md)
> (Proposed) replaces the level conventions, the Fastify request lines and the
> tracer no-op described below. This page describes the code as it is today and
> is rewritten when ADR-0017 is implemented. New code should already follow
> ADR-0017's "log once, where it is handled" and "never log content" rules.

## The short version

Every logger in the system comes from `createLogger()` in `@nebula-chat/otel`.
Inside a request you use `req.log`. Outside one you import the shared instance.
You never call `console.*`.

## Where log lines come from

There is **one Pino instance** on the server's runtime path. It is created in
[`apps/nebula-chat-server/src/logger.ts`](../apps/nebula-chat-server/src/logger.ts)
and exported as `logger`:

```ts
export const logger: Logger = createLogger({
  level: env.LOG_LEVEL,
  pretty: env.NODE_ENV === 'development',
});
```

`server.ts` imports it and hands it to `buildApp({ logger })`, which passes it to
Fastify's `loggerInstance` option. So `app.log`, every `req.log`, and every
module-level import of `@backend/logger` are all the same object.

That gives three ways to log, in order of preference:

| Where you are              | Use               | Why                                           |
| -------------------------- | ----------------- | --------------------------------------------- |
| Inside a request handler   | `req.log`         | Child logger — every line carries the `reqId` |
| App-level (startup, hooks) | `app.log`         | Same instance, no request context             |
| No request in scope at all | `@backend/logger` | Module-level import of the shared instance    |

**Prefer `req.log` whenever you have it.** It is a Pino child bound to the
request's `reqId`, which is the only thing that lets you reconstruct one
request's story out of interleaved concurrent logs.

Current non-request call sites are the Redis client (connection events fire
outside any request) and the cache service (the SSE capture path runs after the
reply is hijacked, when `req.log` is gone).

## Request logging is Fastify's, not ours

Fastify generates the request/response log pair, the `reqId`, and the `req`/`res`
serializers itself. **Never add `pino-http` or a Fastify logger plugin.** Doing so
logs every request twice under two independent `reqId` schemes, which makes
correlation in aggregated logs actively misleading rather than merely noisy.

If you ever see two `incoming request` lines for one request, that is what
happened.

## reqId survives into the LLM call

Non-obvious and worth knowing: `chat.controller.ts` passes `req.log` down through
`chat.service.ts` into `@nebula-chat/langchain`'s `streamChat`, which accepts it
as the duck-typed `LLMLogger` from
[ADR-0005](./adr/0005-langchain-lib.md). So token counts, rate-limit warnings and
provider errors logged from inside the LangChain lib carry the same `reqId` as
the HTTP request that caused them. One pipeline, correlation intact.

This is why `LLMLogger` is duck-typed rather than importing Pino: the lib stays
logger-agnostic while still landing in our stream.

## Levels

`LOG_LEVEL` (default `info`) sets verbosity for everything above. Conventions in
use:

- `error` — a request failed, or a fail-open path swallowed something
- `warn` — degraded but handled: a rate limit hit, an unparseable cached line
- `info` — lifecycle and cache outcomes (`Redis: Cache hit`, `Redis: Saving to cache`)
- `debug` / `trace` — off in production

Errors reach the log through `errorHandler` in `errors/error.handler.ts`, which
calls `reply.log.error(err)` for everything that extends `AppError`. Handlers
never log errors themselves — throw and let the handler do it.

Note the fail-open pattern in the cache: it logs at `error` and continues rather
than failing the request. A cache problem should never be a user-visible failure.

## Tracing

`initTelemetry('nebula-chat-server')` starts the OpenTelemetry Node SDK with
auto-instrumentation for HTTP, Postgres and Redis. It is **a no-op unless
`OTEL_EXPORTER_OTLP_ENDPOINT` is set**, so tracing ships dark and costs nothing
until you turn it on.

Two env vars:

| Variable                      | Effect                                                     |
| ----------------------------- | ---------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Where to send spans. Unset = tracing entirely off          |
| `OTEL_LOG_LEVEL`              | Verbosity of the SDK's _own_ diagnostics (default `error`) |

`OTEL_LOG_LEVEL` is independent of `LOG_LEVEL`: the diag child carries its own
Pino level, so `OTEL_LOG_LEVEL=debug` works without turning the whole app to
debug.

### The import-ordering trap

Auto-instrumentation patches modules as they load, so anything imported _before_
`initTelemetry` runs is never instrumented. In `server.ts` only two imports sit
above the call — `@nebula-chat/otel` and `@backend/env`, neither an
instrumentation target — and `@backend/app` with its `http`/`pg`/`redis` graph
sits below it.

**This works only because the server compiles to CommonJS**, where TypeScript
emits each `import` as a `require` in source position. Under real ESM every
import hoists and the ordering silently stops working — no error, just degraded
traces. If the server ever moves to ESM, `initTelemetry` has to move into its own
first-imported module. Don't let an import sorter reorder that file.

### Local development

`docker-compose.yml` runs `grafana/otel-lgtm`, which accepts OTLP directly — no
Collector needed — and bundles Grafana and Tempo:

```bash
docker compose up -d otel-lgtm
```

Then set `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` in
`apps/nebula-chat-server/.env` and open Grafana at <http://localhost:3001>
(3001, because the server itself uses 3000).

This is the same Grafana + Tempo UI that Grafana Cloud serves, so trace queries
work the same locally and in production.

### Production

Nothing to deploy. The app speaks plain OTLP, so you point it at a hosted
endpoint and set the auth header — no Collector, no sidecar:

```text
OTEL_EXPORTER_OTLP_ENDPOINT=<vendor OTLP endpoint>
OTEL_EXPORTER_OTLP_HEADERS=<vendor auth header>
```

The exporter is constructed with no arguments and reads those standard `OTEL_*`
vars itself, so switching vendors needs no code change. The intended target is
Grafana Cloud's free tier, which is hard-capped rather than overage-billed.

Two caveats on Render's free plan: the service sleeps when idle, so traces exist
only while it is awake; and `initTelemetry` gates on
`OTEL_EXPORTER_OTLP_ENDPOINT` specifically — setting only the more specific
`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` yields a silent no-op.

### If tracing seems broken

The SDK reports its own failures through OpenTelemetry's `diag` channel, which we
route into Pino tagged `component: 'otel'` rather than to the console. So:

```bash
# see what the SDK itself is complaining about
OTEL_LOG_LEVEL=debug pnpm --filter nebula-chat-server dev
```

A failed `sdk.start()` logs an error and leaves the server running without
tracing — observability never takes the service down.

## Deliberately outside this pipeline

Three things do not go through Pino, on purpose. Don't "fix" them:

- **`libs/db` migration scripts** — `migrate.ts` and `baseline.ts` use
  `console.log`. They are CLI tools run by a human via `pnpm db:migrate`;
  structured JSON would be worse than plain text for that audience.
- **`generate-openapi.ts`** — writes with `process.stdout.write` /
  `process.stderr.write`, same reasoning.
- **The frontend** — browser logging is a separate concern entirely.

## Known gaps

- **No redaction.** `createLogger` sets no Pino `redact` paths. Nothing leaks
  today, because Fastify's default request serializer logs method, URL, host and
  remote address rather than all headers. **M-6 changes that**: it introduces
  JWTs, cookies and argon2, and that is the moment an unredacted logger becomes a
  credential leak. Set `redact` paths as part of M-6, not after.
- **Drizzle query logging is off.** The db client passes no `logger` option, so
  SQL is never logged. Wiring it to Pino is a reasonable follow-up ticket.
- **No metrics.** M-5 covers traces and logs only. `@fastify/under-pressure`
  exposes event-loop health in the meantime.
