# ADR-0017: Structured logging conventions — log once, one summary per unit of work, OTel-style flat attributes

- **Status:** Proposed
- **Date:** 2026-09-24
- **Deciders:** @itsDaiton
- **Amends:** [ADR-0007](./0007-otel-lib-and-fastify-native-logger.md) — request log lines and tracer start-up

## Context

ADR-0007 gave the system one Pino instance and one constructor (`createLogger` in `@nebula-chat/otel`), but said nothing about _what_ a line contains. With the shared error lib (ADR-0011) landed, the gap shows:

- **One failure, two lines, no stack.** `streamChat` logs `LLM stream failed` and rethrows; `chatService` catches the same error and logs `Chat request failed`. Both log `{ error: error.message }`, so Pino's `err` serializer never runs and the stack and `cause` are lost twice.
- **One success, ~6 lines.** Fastify's `incoming request`, `Chat request received`, `LLM stream started`, `LLM stream completed`, `Chat request completed`, and the response line — `model`/`provider` repeated on four of them.
- **Every 4xx at `error` with a stack.** `errorHandler` calls `reply.log.error(err)` for everything, so a `NotFound` is indistinguishable from a real fault.
- **No shared vocabulary.** Errors under `err`, `error`, or positional; messages as `Redis: Cache hit`, `redis cache get failed (fail-open)`, `Chat request completed`; `userId` on one line of the chat path and absent from the rest; no service, version, environment or trace ID on any line.

nebula-chat 2.0 (ADR-0013..0016) makes this acute: one user Message crosses server → BullMQ → worker → Redis stream → server, across two independently deployed processes. Lines that cannot be joined across that boundary are close to useless. A `/grill-with-docs` session settled the conventions below.

## Decision

**Scope.** The server, every backend lib, and `apps/nebula-chat-worker` from its first commit. The client is out. `@nebula-chat/langchain` is dissolved in v2 (ADR-0013), so it gets only what it takes to stop double-logging.

### 1. An error is logged once, where it is handled

Code that catches and rethrows — or lets an error propagate — never logs it. Only the final handler does: `errorHandler`, the SSE catch in `chatService`, a fail-open catch, and (v2) the worker's job-failure handler. A layer that wants to add context wraps the error (`cause`) or binds fields on a child logger; it does not write its own line.

A handled error is logged by class: an `Internal` or other 5xx logs at `error` with the full `err` object. A 4xx writes **no line of its own** — its `error.type` rides on the request's `http.request.completed` line.

### 2. One summary line per unit of work

A unit of work — an HTTP request, and in v2 a Job, a Run, a Step — writes exactly **one** line at `info` when it ends, carrying every field that matters (IDs, model, tokens, duration, outcome). Progress within a unit (stream started, cache hit, Intake Agent finished) is `debug`; per-chunk detail is `trace`. The chat path goes from ~6 `info` lines to 2 (`http.request.completed`, `chat.reply.completed`); a Run becomes one line plus one per Step.

### 3. Line shape: `event.name` + readable `msg` + flat dotted attributes

- **`event.name`** is a stable dotted identifier — `chat.reply.completed`, `cache.read.failed`, `server.started` — and the thing dashboards and alerts filter on.
- **`msg`** is a human summary that _may_ interpolate values (`Direct reply completed · gpt-4o-mini · 1 234 tokens · 3.2 s`). Because machines group on `event.name`, `msg` is free to be informative.
- **Attribute keys are flat dotted strings** (`"user.id": "…"`), never nested objects. Pino does not deep-merge: a bound `user: { id }` plus a call-site `user: { kind }` emits the key `user` twice in one JSON line, and most parsers keep only the last. The single exception is **`err`**, which stays an object so Pino's error serializer produces `type`/`message`/`stack`/`cause`.

### 4. Attribute catalogue: semantic conventions first, `nebula.*` for the domain

| Concern   | Keys                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| Service   | `service.name`, `service.version`, `deployment.environment.name` (base fields on every line), `pid`               |
| Request   | `http.request.method`, `url.path`, `http.response.status_code`, `http.request.id`                                 |
| Error     | `err` (object), `error.type` (`AppError` code, else the error class name)                                         |
| LLM       | `gen_ai.provider.name`, `gen_ai.request.model`, `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`         |
| User      | `user.id`, `nebula.user.kind` (`guest` \| `registered`)                                                           |
| Domain    | `nebula.session.id`, `nebula.message.id`, `nebula.run.id`, `nebula.step.id`, `nebula.agent.name`, `nebula.job.id` |
| Subsystem | `nebula.component` (`redis`, `otel`, `auth`, `llm`, …)                                                            |
| Outcome   | `nebula.duration_ms`, `nebula.outcome`                                                                            |
| Trace     | `trace_id`, `span_id` (injected by the OTel Pino instrumentation)                                                 |

The Session is logged as **`nebula.session.id`**, never bare `session.id`, although the code variable is still `conversationId`. OTel's `session.id` means a client browsing session, which would be a third meaning beside the domain Session and the _auth session_ (`CONTEXT.md`).

`hostname` is dropped from the base fields: on Render it is a random container ID.

### 5. Context is bound, not repeated

The auth gate, on resolving the session, binds `user.id` and `nebula.user.kind` onto the request logger; the chat path binds `nebula.session.id` once the Session is known. Every later line in that scope carries them — including `http.request.completed` — without call sites passing them.

### 6. Fastify's request lines are replaced by ours

`disableRequestLogging: true`, and an `onResponse` hook writes `http.request.completed` (`info`) with the catalogue keys, the bound user, `error.type` for a 4xx, and `nebula.duration_ms`; `http.request.received` goes to `debug`. The request ID is relabelled `http.request.id`. Everything ADR-0007 actually protected stays: `req.log` child loggers, Fastify's request-ID generation, and **no `pino-http`**. Because the chat reply is hijacked, the HTTP status says nothing about the reply's fate — `chat.reply.completed` carries `nebula.outcome` (`completed` | `rate_limited` | `failed`).

### 7. The tracer always runs; only the exporter is gated

This amends ADR-0007's "no-op when `OTEL_EXPORTER_OTLP_ENDPOINT` is unset". The SDK now always starts context propagation and ID generation, so every line inside a span carries `trace_id`/`span_id`; the endpoint gates only the **exporter**. One correlation ID exists in every environment, with or without a trace backend.

### 8. Cross-process correlation (v2 requirement)

A job payload in `@nebula-chat/contracts` carries a W3C `traceparent` plus the domain IDs (`user.id`, `nebula.session.id`, `nebula.message.id`, `nebula.run.id`). The worker starts the job's span as a child of that trace and binds those IDs onto the job logger. One `trace_id` then spans server request → worker job → Steps. Recorded here as a requirement on the NEB-349 epic; nothing is built for it now.

### 9. Levels mean one thing each

| Level   | Meaning                                              | Examples                                                             |
| ------- | ---------------------------------------------------- | -------------------------------------------------------------------- |
| `fatal` | The process is about to exit                         | boot failure, unhandled rejection                                    |
| `error` | Something failed and a human should look             | 5xx, failed Run/Job, unexpected exception                            |
| `warn`  | Degraded but handled; the user is unaffected or told | fail-open cache failure, retry, Run ended `partial`, OTel start fail |
| `info`  | One summary per unit of work, plus process lifecycle | `http.request.completed`, `chat.reply.completed`, `server.started`   |
| `debug` | Progress inside a unit                               | LLM stream started, cache hit/miss, Intake Agent finished            |
| `trace` | Per-chunk detail                                     | each Streaming token, raw provider events                            |

Fail-open Redis failures move from `error` to `warn`.

**Switching.** `LOG_LEVEL` stays the default. A new `LOG_LEVEL_OVERRIDES` (e.g. `redis=debug,llm=trace`) sets a per-`nebula.component` level at boot — the component child carries its own Pino level, the same mechanism ADR-0007 already uses for the OTel diag child. `OTEL_LOG_LEVEL` is unchanged and remains the OTel-standard control for SDK diagnostics. On Render, changing either redeploys.

### 10. Never logged

Message content, prompts, completions, Streaming tokens, emails, names, cookies, `Authorization` headers, API keys. Opaque IDs (`user.id`) are fine. `createLogger` configures Pino `redact` for the known sensitive paths as a backstop, so a mistake is censored rather than leaked — closing the redaction gap `docs/logging.md` already lists.

### 11. Third-party lines get a generic event name

Free-text output we do not author — better-auth (`libs/auth/src/logger.ts`), OTel diagnostics (`libs/otel/src/diag.ts`), Fastify's own lifecycle lines — is stamped by its adapter with a per-source `event.name` (`auth.library.log`, `otel.diag.log`, `fastify.log`) and `nebula.component`, passing the library's text through as `msg`. The invariant "every line has an `event.name`" holds, so a filter on it never hides third-party output.

### 12. Enforced by types, not only by convention

`@nebula-chat/otel` exports the attribute keys as constants, a union type of known `event.name`s (including the generic third-party ones), and a thin typed helper — `logEvent(logger, level, eventName, attrs, msg)` — that rejects unknown keys and events at compile time. An ESLint `no-restricted-syntax` rule rejects an `error:` key in a log call. `createLogger` makes `service.name` required, so no lib can construct an unlabelled logger. `docs/logging.md` is rewritten to these rules when they are implemented.

**Development output.** `pino-pretty` hides the base fields and `pid`, renders `event.name · msg` as the headline, and prints remaining attributes beneath. Production JSON is unaffected.

## Alternatives considered

- **`msg` as a static lowercase phrase with camelCase keys** (`chat reply completed`, `conversationId`). Friendlier in a console and consistent with code identifiers, but a bare phrase carries too little on its own and camelCase keys would need remapping for any OTLP log export. Rejected in favour of `event.name` + a rich `msg` + semantic conventions.
- **Nested attribute objects.** Rejected: Pino's shallow merge produces duplicate JSON keys between bindings and call sites.
- **Every layer logs what it saw** (status quo). Rejected: it is the duplication this ADR exists to remove.
- **4xx as a separate `warn` line.** Rejected: one line per request is the goal, and the status code on `http.request.completed` already classifies it. The cost is that client errors are found by `http.response.status_code >= 400`, not by level.
- **Keep Fastify's request lines and reshape them with custom `req`/`res` serializers.** Rejected: more code than an `onResponse` hook, and still leaves `incoming request` at `info`.
- **Keep the tracer a full no-op without an endpoint.** Rejected: it leaves production with no cross-process correlation ID; `http.request.id` stops at the server.
- **Runtime level switching** (authenticated endpoint or signal). Deferred, not rejected — it needs an authorization model there is no admin role for, and a Redis pub/sub broadcast once there are several instances. Revisit when a restart starts costing in-flight Runs.
- **OTLP log export to Grafana Loki.** Deferred: stdout JSON stays the source of truth; the attribute choices above make export a later env switch.
- **Convention in docs only, no typed helper.** Rejected: field names become the interface of queries and alerts, so a typo is a silent break.

## Consequences

- **Positive:** a failure produces one line with its stack; a request produces one `info` line and a chat reply two; every line knows its service, user and trace; v2 lines join across processes on `trace_id` and domain IDs; field names are compile-checked.
- **Negative / tradeoffs:**
  - Every existing log call site is rewritten. Grafana queries or saved searches against today's keys (`reqId`, `res.statusCode`, `component`) break once.
  - The SDK's in-process cost is paid even when nothing exports. ADR-0007 already accepted that its packages load unconditionally; this adds span bookkeeping on top.
  - Dotted keys are noisier than camelCase to read in raw JSON; the pretty dev format mitigates it locally only.
  - Level changes need a redeploy until runtime switching exists.
- **Neutral:** no HTTP API, OpenAPI or DB change.

## Follow-ups

- Runtime log-level switching (deferred above).
- OTLP log export to Grafana Loki (deferred above).
- Decision 8 as a requirement on the v2 `@nebula-chat/contracts` and worker tickets under NEB-349.
