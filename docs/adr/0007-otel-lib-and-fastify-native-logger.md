# ADR-0007: Extract logging and tracing into `@nebula-chat/otel`, with no Fastify logger plugin

- **Status:** Accepted (implementation pending on `feat/m-5-otel`)
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
- **`initTelemetry(serviceName)`** — OpenTelemetry `NodeSDK` initialisation with auto-instrumentations and an OTLP trace exporter. Called as the first statement in `src/server.ts`, before every other import, so instrumentation can patch modules before they are loaded. A no-op when `OTEL_EXPORTER_OTLP_ENDPOINT` is unset.
- **No Fastify plugin, and no `pino-http` dependency.** This is the deliberate deviation from TICKET-M5.

**Request logging stays Fastify-native.** `src/app.ts` continues to own the request log, changing only to source its instance from the lib: `Fastify({ logger: createLogger({ level: env.LOG_LEVEL, pretty: env.NODE_ENV === 'development' }) })`. Fastify's own logger integration already provides request/response log pairs, `reqId` generation and propagation, `req`/`res` serializers, and a per-request child logger on `req.log`. `pino-http` exists to give those things to frameworks that lack them; Fastify is not one.

`initTelemetry` reads `process.env.OTEL_EXPORTER_OTLP_ENDPOINT` **directly**, not through the server's Zod-validated `env` object. A published lib must not depend on one consumer's env schema, and importing `src/env.ts` from `initTelemetry` would pull `dotenv` and Zod into the module graph ahead of the SDK, defeating the import-ordering requirement that makes auto-instrumentation work at all. The var is nonetheless declared as `OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional()` in `src/env.ts` so that it is documented and validated for the app's own use.

Scope is **traces and logs only**. OpenTelemetry metrics are out of scope for M-5.

The lib follows the `libs/langchain` package shape — `tsup` dual ESM+CJS build, full `exports` map, `@types/node: catalog:`, `publishConfig` to GitHub Packages — not the `"build": "tsc"` snippet in TICKET-M5. It is registered in `release-please-config.json` as component `nebula-chat-otel`, without which the lib would never publish and the library-triggered server deploy wired up in `8c68245` would never fire for it.

## Alternatives Considered

- **Implement TICKET-M5 literally: `Fastify({ logger })` *and* a `pino-http` `onRequest` hook.** Rejected — this is not a redundancy, it is a defect. Every request would be logged twice, by two Pino instances, with two independent `reqId` schemes, making request correlation in aggregated logs actively misleading. The ticket was written before M-1 landed and did not anticipate `Fastify({ logger })`.
- **`Fastify({ logger: false })` plus the ticket's `pino-http` plugin as the single request logger.** Rejected — resolves the double-logging correctly, but pays for it by discarding Fastify's built-in `reqId` propagation and `req.log` child loggers, which the existing route, service, and controller layers already use. It would mean rewriting working call sites to gain nothing, and it fights the framework rather than using it.
- **Keep `src/logger.ts` and add the OTel SDK beside it.** Rejected — leaves the two-instance split in place and gives M-4, M-7, and M-10 no shared logger to consume, which is the actual problem. This is the half-fix that ADR-0005 rejected for the same reason in the LLM case.
- **Include OpenTelemetry metrics and a Prometheus exporter in M-5.** Deferred, not rejected. Metrics need decisions about cardinality and a scrape target that traces do not, and none of it is in M-5's acceptance criteria. `@fastify/under-pressure` already exposes event-loop health today. Revisit once a trace backend is actually chosen.
- **Commit to a hosted trace vendor (Grafana Cloud, Honeycomb) as part of M-5.** Rejected for now — vendor selection is a separate decision with its own lock-in, and M-5's acceptance criteria only require that the SDK initialise when the endpoint is set and no-op when it is not. An OTLP collector added to `apps/nebula-chat-server/docker-compose.yml` makes the wired path verifiable locally without signing up for anything. Note that "no-op when the env var is absent" is untestable if there is no way to ever set it, which is the point of the local collector.

## Consequences

- **Positive:**
  - One logger constructor for the whole system. M-4, M-7, and M-10 consume `createLogger()` via `workspace:*` instead of each hand-rolling a Pino instance, which is the trajectory `src/logger.ts` was already on.
  - Request logging behaviour is unchanged by this ADR. `app.log`, `req.log`, `reqId`, and the existing serializers all keep working, because the framework integration that provides them is retained.
  - Tracing is opt-in by environment alone. Setting `OTEL_EXPORTER_OTLP_ENDPOINT` activates auto-instrumentation across HTTP, Postgres, and Redis with no per-call-site code, and unsetting it removes all of it.
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

- **Files added:** `libs/otel/` — `src/logger.ts` (`createLogger`, `LoggerOptions`, `Logger`), `src/tracing.ts` (`initTelemetry`), `src/index.ts`, `package.json`, `tsconfig.json`, `tsup.config.ts`.
- **Files deleted:** `apps/nebula-chat-server/src/logger.ts`.
- **Files modified:** `src/app.ts` (source the Fastify logger from `createLogger`), `src/server.ts` (`initTelemetry` first, repoint the startup error logger), `src/cache/cache.client.ts` and `src/cache/cache.service.ts` (repoint logger import), `src/env.ts` (add optional `OTEL_EXPORTER_OTLP_ENDPOINT`), `apps/nebula-chat-server/package.json` (drop `pino` and `pino-pretty`, add `@nebula-chat/otel: workspace:*`), `release-please-config.json` (register `libs/otel`), `apps/nebula-chat-server/docker-compose.yml` (add an OTLP collector service), and `docs/new-backend/TICKET-M5-otel.md` (correct the spec to match this ADR).
- **Migrations required:** none.
- **Rollback plan:** revert the `feat/m-5-otel` branch. Restore `src/logger.ts` and its three import sites, re-add `pino` and `pino-pretty` to the server, restore the inline Pino config in `src/app.ts`, remove the `initTelemetry` call and the `libs/otel` release-please entry, and delete `libs/otel/`. No DB rollback; nothing persisted changes.

## Verification

Not yet run — this ADR records the decision ahead of implementation, unlike ADR-0004 and ADR-0005, which were written post-implementation. The acceptance criteria to confirm on `feat/m-5-otel`:

- `pnpm typecheck` and `pnpm lint` pass at the workspace root.
- `pnpm --filter @nebula-chat/otel build` emits dual ESM+CJS output.
- `grep -rn "from '@backend/logger'" apps/nebula-chat-server/src/` returns nothing, and `src/logger.ts` is gone.
- `pino` and `pino-pretty` no longer appear in `apps/nebula-chat-server/package.json`.
- Server boots with `OTEL_EXPORTER_OTLP_ENDPOINT` unset and emits no OTel errors.
- Server boots with the var pointed at the compose collector, and a request to `GET /health` produces a trace in the collector's output.
- A single request produces exactly **one** pair of request/response log lines, sharing one `reqId` — the regression this ADR exists to prevent.
