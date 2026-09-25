# ADR-0007: Extract logging and tracing into `@nebula-chat/otel`, with no Fastify logger plugin

- **Status:** Accepted — implemented on `feat/m-5-otel`. Amended by [ADR-0017](./0017-structured-logging-conventions.md): request logging is no longer Fastify-native, and the tracer is no longer a no-op without an endpoint.
- **Date:** 2026-09-13
- **Deciders:** @itsDaiton

## Context

Logging in `apps/nebula-chat-server` is currently split across two unrelated Pino instances:

1. **Fastify's built-in logger.** `src/app.ts` passes a Pino config object into the `Fastify({ logger })` constructor, with `pino-pretty` transport in development and a bare config in production, both at `env.LOG_LEVEL`. This is what serves `app.log` and the per-request `req.log` child loggers throughout the route, service, and controller layers.
2. **A standalone module-level instance.** `src/logger.ts` constructs a second Pino instance with its own hardcoded config. It exists because non-request-scoped code has no `req.log` to reach for: `src/cache/cache.client.ts`, `src/cache/cache.service.ts`, and the startup failure handler in `src/server.ts` all import it. `docs/new-backend/TICKET-M5-otel.md` labels this a deliberate M-1-era workaround and instructs M-5 to delete it.

Neither instance is shareable. M-4 (`@nebula-chat/cache`), M-7 (queue workers), and M-10 (the cockatiel circuit breaker) all need to log from outside the HTTP request lifecycle, and none of them can import from `apps/nebula-chat-server`. Left alone, each would construct its own Pino with its own level, format, and redaction rules — exactly as `src/logger.ts` already does. There is also no distributed tracing anywhere in the stack.

The monorepo has a settled pattern for this, established by ADR-0004 (`@nebula-chat/db`) and ADR-0005 (`@nebula-chat/langchain`): a standalone, versioned, dual-format workspace library consumed via `workspace:*`, owning one infrastructural concern. Observability is the next such concern.

TICKET-M5 specifies the lib, but its implementation sketch predates the Fastify migration it now has to coexist with. It instructs M-5 to export a `fastifyLoggerPlugin` that registers **`pino-http`** on an `onRequest` hook. That collides head-on with the `Fastify({ logger })` call that M-1 actually shipped in `src/app.ts`.

## Decision

Create `libs/otel/` as a workspace package published as `@nebula-chat/otel`, owning two exports and deliberately **not** a third:

- **`createLogger(options)`** — a Pino factory. The single constructor for every logger in the system, in apps and libs alike.
- **`initTelemetry(serviceName, options?)`** — OpenTelemetry `NodeSDK` initialisation with auto-instrumentations and an OTLP trace exporter. Called near the top of `src/server.ts`, above every import that reaches an instrumented module, so instrumentation can patch them before they load. A no-op when `OTEL_EXPORTER_OTLP_ENDPOINT` is unset. (See **Import ordering** below — "first statement" turned out not to be literally achievable.)
- **No Fastify plugin, and no `pino-http` dependency.** This is the deliberate deviation from TICKET-M5.

**The SDK's own diagnostics go through Pino, at an env-controlled level.** OpenTelemetry reports its internal failures — unreachable endpoint, exporter errors, instrumentation problems — through its `diag` API, which is silent by default. Left alone, a broken exporter is invisible; and the conventional remedy, `diag.setLogger(new DiagConsoleLogger(), ...)`, writes to `console.*`, which this repo forbids outright and which would bypass the very pipeline this ADR creates. So an internal `src/diag.ts` adapts `DiagLogger` onto a `logger.child({ component: 'otel' })`, mapping OTel's `verbose` onto Pino's `trace`.

The install point is exact and non-obvious: **after the `NodeSDK` constructor, still before `sdk.start()`**. `sdk-node@0.222.0`'s constructor itself calls `diag.setLogger(new DiagConsoleLogger(), ...)` whenever `OTEL_LOG_LEVEL` is set **in the environment**, so attaching the Pino adapter beforehand is silently overwritten and diagnostics go to the console as plain text. (An earlier draft of this ADR claimed `env.ts` "now defaults" the var and therefore always triggers this. That was wrong: a Zod `.default()` populates the parsed `env` object and never writes back to `process.env`, so the constructor sees the var only when it is genuinely set. The post-constructor placement is still required for exactly that case.) Attaching after the constructor but before `start()` still captures everything the SDK reports while booting: resource detection, instrumentation registration, the first export. The call also passes `suppressOverrideMessage: true`, because the API otherwise announces the override _through the logger it is replacing_ — a raw stack trace on stdout, precisely the output the adapter exists to prevent. The level comes from **`OTEL_LOG_LEVEL`** — the OTel-standard var name, over the standard value set (`none` | `error` | `warn` | `info` | `debug` | `verbose` | `all`). **The fallback is `error`, not `none`**: silence is the failure mode being fixed, and `error` surfaces real breakage without adding production noise. `component: 'otel'` is what makes SDK chatter filterable once logs are aggregated.

Two further details are load-bearing. First, **the diag child carries its own Pino level.** `diag.setLogger`'s level only stops OTel from calling the adapter; Pino filters independently, and a child inherits its parent's level — so with the parent at the default `info`, every `debug` and `verbose` diagnostic was dropped no matter what `OTEL_LOG_LEVEL` said. `OTEL_LOG_LEVEL` was effectively inert above `info` until the child was given its own level. Second, **`sdk.start()` is wrapped**: observability must never be able to take the service down, so a failed start (bad endpoint, exporter refusing to initialise, a throwing instrumentation) logs an error and degrades to no tracing instead of aborting boot, and the `SIGTERM` shutdown hook is registered only on success.

**One Pino instance on the runtime path.** `initTelemetry` needs a logger for the above, and constructing its own would reintroduce exactly the two-instance split this ADR exists to remove. So both `initTelemetry(serviceName, { logger })` and `buildApp({ logger })` accept an injected logger, and the instance itself lives in **`src/logger.ts`**, exported as `logger`. `server.ts` imports it and passes it to both; `buildApp` falls back to that same import when nothing is injected, which keeps its two argument-less call sites — `src/server.ts` and `src/scripts/generate-openapi.ts` — working unchanged and still gives M-9 an injectable logger for tests.

`src/logger.ts` therefore survives this ticket, at the same path TICKET-M5 says to delete, but with an inverted role. The M-1-era file was a _second_ Pino with its own hardcoded config, competing with the one Fastify built. The new one **is** the instance Fastify is built with. An intermediate version of this change had `cache.client.ts`, `cache.service.ts` and `app.ts` each call `createLogger()` at module level, which is what the ticket's wording literally prescribed — and that shipped three competing instances and three `pino-pretty` workers in development, reintroducing the exact split this ADR exists to remove. Both review axes caught it independently.

The one remaining separate instance is in `load-env.ts`, which exists to populate `process.env` _before_ `env.ts` parses it and so cannot import either `@backend/env` or `@backend/logger`. It uses a bare `createLogger()` falling back to `process.env.LOG_LEVEL`. So: exactly one instance on the runtime path, plus one short-lived bootstrap instance.

**Request logging stays Fastify-native.** `src/app.ts` continues to own the request log, changing only to source its instance from the lib. Fastify's own logger integration already provides request/response log pairs, `reqId` generation and propagation, `req`/`res` serializers, and a per-request child logger on `req.log`. `pino-http` exists to give those things to frameworks that lack them; Fastify is not one.

The instance goes to Fastify v5's **`loggerInstance`** option, not `logger`. This ADR and TICKET-M5 both originally specified `Fastify({ logger: createLogger(...) })`, which does not compile: on v5 `logger` accepts a boolean or a Pino _config object_, and passing an already-constructed instance makes TypeScript fall through to the http2 overload and emit a dozen unrelated `Http2SecureServer` errors. The instance is annotated `FastifyBaseLogger` so Fastify's logger generic does not specialise it past `buildApp`'s declared `Promise<FastifyInstance>`.

**Import ordering: "first statement" is not literally achievable.** The injected logger's `level` and `pretty` come from the Zod-validated `@backend/env`, and `pretty` cannot be applied after construction because Pino fixes its transport at construction time — so there is no way to create the one shared instance without importing `env` first. The resolution is to allow exactly two imports above the `initTelemetry` call, `@nebula-chat/otel` and `@backend/env`, and keep `@backend/app` and its `http`/`pg`/`redis` graph below it. `env.ts` pulls in only `dotenv` and Zod, neither an instrumentation target, so nothing observable is lost.

This works **only because the server compiles to CommonJS** (`"module": "commonjs"`, plus `tsx` in development), where TypeScript emits each `import` as a `require` in source position — verified in `dist/src/server.js`, where `require("./app")` lands after the `initTelemetry()` call. Under real ESM every import hoists and the ordering silently stops working, degrading instrumentation without any error. Moving the server to ESM therefore requires moving `initTelemetry` into its own first-imported module. The alternative — keeping the literal first-statement guarantee — costs either a second Pino instance dedicated to diagnostics or that same extra module, and was judged not worth it.

`initTelemetry` reads `process.env.OTEL_EXPORTER_OTLP_ENDPOINT` **directly**, not through the server's Zod-validated `env` object. A published lib must not depend on one consumer's env schema, and importing `src/env.ts` from `initTelemetry` would pull `dotenv` and Zod into the module graph ahead of the SDK, defeating the import-ordering requirement that makes auto-instrumentation work at all. The var is nonetheless declared as `OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional()` in `src/env.ts` so that it is documented and validated for the app's own use.

Scope is **traces and logs only**. OpenTelemetry metrics are out of scope for M-5.

The lib follows the `libs/langchain` package shape — `tsup` dual ESM+CJS build, full `exports` map, `@types/node: catalog:`, `publishConfig` to GitHub Packages — not the `"build": "tsc"` snippet in TICKET-M5. It is registered in `release-please-config.json` as component `nebula-chat-otel`, without which the lib would never publish and the library-triggered server deploy wired up in `8c68245` would never fire for it.

## Alternatives Considered

- **Implement TICKET-M5 literally: `Fastify({ logger })` _and_ a `pino-http` `onRequest` hook.** Rejected — this is not a redundancy, it is a defect. Every request would be logged twice, by two Pino instances, with two independent `reqId` schemes, making request correlation in aggregated logs actively misleading. The ticket was written before M-1 landed and did not anticipate `Fastify({ logger })`.
- **`Fastify({ logger: false })` plus the ticket's `pino-http` plugin as the single request logger.** Rejected — resolves the double-logging correctly, but pays for it by discarding Fastify's built-in `reqId` propagation and `req.log` child loggers, which the existing route, service, and controller layers already use. It would mean rewriting working call sites to gain nothing, and it fights the framework rather than using it.
- **Keep `src/logger.ts` and add the OTel SDK beside it.** Rejected — leaves the two-instance split in place and gives M-4, M-7, and M-10 no shared logger to consume, which is the actual problem. This is the half-fix that ADR-0005 rejected for the same reason in the LLM case.
- **Include OpenTelemetry metrics and a Prometheus exporter in M-5.** Deferred, not rejected. Metrics need decisions about cardinality and a scrape target that traces do not, and none of it is in M-5's acceptance criteria. `@fastify/under-pressure` already exposes event-loop health today. Revisit once a trace backend is actually chosen.
- **Commit to a hosted trace vendor as part of M-5.** Partly resolved. The app stays **vendor-neutral by construction** — it speaks only OTLP to `OTEL_EXPORTER_OTLP_ENDPOINT`, with no vendor SDK, no vendor config, and no vendor-specific code — so this is reversible by environment variable and carries no lock-in worth deferring for. The intended production target is **Grafana Cloud**, chosen for a free tier that is _hard-capped rather than overage-billed_ (50 GB traces/month, 14-day retention, 3 users), which matters for a service already running on Render's free plan: it cannot produce a surprise bill. Nothing is deployed as part of M-5 — the var stays unset in production and the tracing code ships dark.
- **Run an OpenTelemetry Collector.** Rejected, locally and in production. A Collector routes and buffers telemetry; it stores nothing and has no UI, so the first draft of this ticket — a bare Collector with a `debug` exporter — could only print spans into a container log, which proves the wiring but is close to useless for reading a trace. Locally, `grafana/otel-lgtm` accepts OTLP directly and bundles Grafana + Tempo, so the trace UI in development is the same one Grafana Cloud serves in production. In production a Collector would have to be a second always-on Render service, on a free plan with no sidecars that spins down when idle. A Collector earns its cost with several services fanning in, vendor swapping without redeploys, tail-based sampling for ingest cost, or stripping PII before telemetry leaves the network — none of which is true at one service and hobby volume. Revisit when any of those becomes true.

## Consequences

- **Positive:**
  - One logger constructor for the whole system. M-4, M-7, and M-10 consume `createLogger()` via `workspace:*` instead of each hand-rolling a Pino instance, which is the trajectory `src/logger.ts` was already on.
  - Request logging behaviour is unchanged by this ADR. `app.log`, `req.log`, `reqId`, and the existing serializers all keep working, because the framework integration that provides them is retained.
  - Tracing is opt-in by environment alone. Setting `OTEL_EXPORTER_OTLP_ENDPOINT` activates auto-instrumentation across HTTP, Postgres, and Redis with no per-call-site code, and unsetting it removes all of it.
  - The observability stack reports its own failures into the same log stream it feeds, tagged `component: 'otel'`, at a level operators can turn up via `OTEL_LOG_LEVEL` without a code change. There is no second console channel to watch.
  - `src/logger.ts` and the `pino` / `pino-pretty` direct dependencies leave `apps/nebula-chat-server` entirely; Pino arrives transitively through the lib, so its version is pinned in exactly one place.
- **Negative / Tradeoffs:**
  - The lib's public surface and Fastify's logger option are coupled by contract: `createLogger()` must keep returning something Fastify accepts as a `logger`. If a future Fastify major changes that shape, the lib changes with it. Accepted, because the alternative is reimplementing request logging ourselves.
  - `initTelemetry` reading `process.env` directly is a deliberate hole in the otherwise-total "all env goes through Zod" convention in `src/env.ts`. The duplicate declaration in `env.ts` documents the var but does not gate the lib's read of it, so a malformed endpoint URL surfaces as an OTel exporter error at runtime rather than a Zod parse failure at boot.
  - The import-ordering requirement in `src/server.ts` is load-bearing and invisible: moving the `initTelemetry` call below another import silently degrades auto-instrumentation rather than failing. This needs a comment at the call site, and it is the kind of constraint a future refactor or an import-sorting lint rule will break.
  - OTel auto-instrumentations add cold-start time and install weight on Render even when the exporter is disabled, since the SDK packages are imported unconditionally.
- **Neutral:**
  - No HTTP API surface change, no OpenAPI change, no Orval regeneration, no DB schema change. This is server-internal wiring.
  - The `/api/cache` routes and the chat streaming path are untouched. Their only change is which module their logger import resolves to.

## Implementation Notes

- **Files added:** `libs/otel/` — `src/logger.ts` (`createLogger`, `LoggerOptions`, `Logger`), `src/tracing.ts` (`initTelemetry`), `src/diag.ts` (`resolveDiagLevel`, `attachDiagLogger` — internal, not re-exported), `src/index.ts`, `package.json`, `tsconfig.json`, `tsup.config.ts`, `.gitignore` (mandatory step 1 of the root AGENTS.md "Creating a new lib" checklist, which the original ticket omitted).
- **Files deleted:** `apps/nebula-chat-server/src/logger.ts`.
- **Files modified:** `src/app.ts` (`buildApp(opts?: { logger?: Logger })`, sourcing the Fastify logger from `createLogger` when none is injected), `src/server.ts` (`initTelemetry` first, one logger created and passed to both it and `buildApp`, repointed startup error logger), `src/cache/cache.client.ts` and `src/cache/cache.service.ts` (repoint logger import), `src/env.ts` (add optional `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_LOG_LEVEL`), `apps/nebula-chat-server/package.json` (drop `pino` and `pino-pretty`, add `@nebula-chat/otel: workspace:*`), `release-please-config.json` (register `libs/otel` as `nebula-chat-otel`), `apps/nebula-chat-server/docker-compose.yml` (add an OTLP collector service), root `AGENTS.md` (Monorepo Structure diagram listed only `libs/db`), and `docs/new-backend/TICKET-M5-otel.md` (correct the spec to match this ADR).
- **Migrations required:** none.
- **Rollback plan:** revert the `feat/m-5-otel` branch. Restore the M-1-era `src/logger.ts` and its four import sites (`server.ts`, `cache.client.ts`, `cache.service.ts`, `load-env.ts`), re-add `pino` and `pino-pretty` to the server, restore the inline Pino config in `src/app.ts`, remove the `initTelemetry` call and the `libs/otel` release-please entry, and delete `libs/otel/`. No DB rollback; nothing persisted changes.

## Verification

Verified on `feat/m-5-otel`:

- `pnpm turbo run typecheck` — 8/8 pass. (Note: there is no root `pnpm typecheck` script; an earlier draft of this ADR and of the ticket both prescribed one that does not exist.)
- `pnpm run lint` with `--max-warnings=0` — pass. `prettier --check .` — clean.
- `pnpm --filter @nebula-chat/otel build` — dual ESM+CJS plus `.d.ts` and `.d.mts`.
- `pino` and `pino-pretty` are absent from `apps/nebula-chat-server/package.json`; `@nebula-chat/otel: workspace:*` is present.
- Exactly two `createLogger(` call sites in the server: `src/logger.ts` (the shared runtime instance) and `load-env.ts` (the pre-env bootstrap instance).
- Import ordering holds in the _compiled_ output, which is the only place it can be checked: in `dist/src/server.js`, `require("./app")` appears after the `initTelemetry()` call.
- Server boots with `OTEL_EXPORTER_OTLP_ENDPOINT` unset — silent no-op, no OTel output, `GET /health` and `GET /` both 200 without Postgres or Redis running.
- One HTTP request produces exactly one request/response log pair sharing one `reqId` — the regression this ADR exists to prevent.

Not verified, and why:

- **The local `otel-lgtm` service end to end.** No container runtime was available when this landed, so the compose service and its `cap_drop: ALL` hardening are unexercised. A span has never actually been seen arriving in Tempo. This is the weakest part of the change.
- **Diag routing at the current code.** The five `diag` levels were confirmed reaching Pino tagged `component: 'otel'`, with `verbose` arriving as `trace` and `OTEL_LOG_LEVEL=none` silencing — but that was measured _before_ the diag child was given its own Pino level, and before `sdk.start()` was wrapped. Those two changes are typechecked and linted, not re-exercised at runtime.
- **`initTelemetry`'s failure path.** The `try/catch` around `sdk.start()` has never been triggered.

All three want a test, which is M-9.
