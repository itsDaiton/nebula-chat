# ADR-0017: Structured logging conventions, our own request line, and an always-on tracer

- **Status:** Accepted — implemented on `feat/neb-369-structured-logging` (NEB-369)
- **Date:** 2026-09-25
- **Deciders:** @itsDaiton
- **Supersedes in part:** [ADR-0007](./0007-otel-lib-and-fastify-native-logger.md) — its "Request logging stays Fastify-native" decision, and `initTelemetry` being a no-op without an endpoint. The rest of ADR-0007 stands: one Pino instance from `createLogger`, no `pino-http`, diag routed into Pino, the import ordering in `server.ts`.

## Context

ADR-0007 settled _where_ log lines go: one Pino instance, handed to Fastify as `loggerInstance`. It said nothing about _what_ a line contains, and the logs were hard to use:

- A failed Direct reply wrote two error lines, both as `{ error: error.message }`, which drops the stack and cause. The error handler logged every 4xx at `error` with a full stack.
- A successful reply wrote about six `info` lines, in several message styles.
- Most lines could not say which User, Session, service or trace they belonged to. The tracer did not run at all in production, because the endpoint was unset there.
- `LOG_LEVEL` was global, and nothing was redacted.

nebula-chat 2.0 (NEB-349) moves LLM work into a separately deployed worker. One user Message will cross server → queue → worker → Redis stream → server, and lines that cannot be joined across that path are close to useless.

## Decision

- **One line shape, enforced by types.** Every line carries a stable dotted `event.name`, a human `msg`, and flat dotted attributes (OTel semantic conventions, `nebula.*` for domain concepts). The one nested value is `err`. `@nebula-chat/otel` owns the catalogue (`events.ts`, `attributes.ts`) and writes lines through `logEvent`, so an unknown event or key is a compile error. Third-party lines go through stamped adapters (`auth.library.log`, `otel.diag.log`, `fastify.log`).
- **Log once, where handled.** A 5xx writes one `error` line. A 4xx writes none; its code rides on the completion line as `error.type`. Libraries rethrow without logging.
- **One `info` line per unit of work.** We replace Fastify's `incoming request`/`request completed` pair with our own `http.request.completed`, written by a root `onResponse` hook. Fastify's request logging is switched off through its `logController` option. That option is also where its remaining internal lines get stamped. The Direct reply writes one `chat.reply.completed`.
- **Context on every line.** `createLogger` stamps the service fields (a required `serviceName`) and `trace_id`/`span_id`, the latter through a mixin. The auth gate binds the User on `req.log` and `reply.log`, and the chat service binds the Session.
- **The tracer always runs.** `initTelemetry` always starts the SDK. `OTEL_EXPORTER_OTLP_ENDPOINT` only decides whether spans are exported. Without it, a discarding span processor stands in, and metrics and log export are pinned to nothing.
- **Per-component levels and redaction** live in `createLogger` (`levelOverrides`, `LOG_LEVEL_OVERRIDES`; `redact` paths).

## Alternatives Considered

- **Keep Fastify's request lines and add ours beside them.** Rejected. That is three `info` lines per request, where one is the point.
- **`pino-http`.** Still rejected, for ADR-0007's reason: it double-logs, with two request-id schemes.
- **`@opentelemetry/instrumentation-pino` for trace ids.** Rejected. Pino is loaded through this lib before `initTelemetry` runs, so the instrumentation never patches it. It could only add duplicate keys or ship logs over OTLP, and stdout JSON stays the log sink.
- **Keep the tracer off without an endpoint.** Rejected. That leaves no `trace_id` in production, where it matters, and nothing for NEB-357 to build on.

## Consequences

- **Positive:**
  - Lines are filterable by event, attributable to a User and a Session, and joinable by `trace_id`. The worker (NEB-354) starts on these conventions.
  - Misnamed keys fail at compile time rather than silently in a dashboard.
- **Negative / Tradeoffs:**
  - We now own the request line. ADR-0007's warning ("the alternative is reimplementing request logging ourselves") is accepted: the reimplementation is two hooks.
  - Suppressing Fastify's "Server listening" line means briefly swapping `app.log` during `listen()`, since Fastify offers no option for it.
  - The always-on tracer costs span creation on every request even when nothing is exported.
  - Under `tsx` (`pnpm dev`) auto-instrumentation does not patch, so dev lines carry no `trace_id`. The compiled server does.
  - `@nebula-chat/redis` logs through the logger it was built with at startup, so its `cache.*.failed` lines carry no request id or User.
- **Neutral:** No API, OpenAPI or schema change. `createLogger`'s required `serviceName` is a breaking change to `@nebula-chat/otel`.

See [docs/logging.md](../logging.md) for the conventions in full.
