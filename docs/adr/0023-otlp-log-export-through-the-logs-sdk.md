# ADR-0023: OTLP log export — the OpenTelemetry logs SDK fed by a Pino multistream, opt-in by env

- **Status:** Accepted — implemented by NEB-371 (#371)
- **Date:** 2026-10-16
- **Deciders:** @itsDaiton
- **Related:** [ADR-0017](./0017-structured-logging-conventions.md) — deferred this as "OTLP log export to Grafana Loki"; [ADR-0007](./0007-otel-lib-and-fastify-native-logger.md) — vendor-neutral OTLP, Grafana Cloud as the target, no Collector

## Context

Logs reach only stdout, which on Render means a log viewer with short retention and no querying across services. Traces already go to Grafana (Tempo) over OTLP, so a slow trace cannot be clicked through to its log lines. ADR-0017 chose flat, dotted, OpenTelemetry-style attribute names and a `trace_id` mixin so that export would be mostly a switch.

The constraints:

- **Vendor-neutral.** Only OTLP, configured by the standard `OTEL_*` variables, like traces.
- **Free-tier bounded.** Grafana Cloud's free tier is hard-capped (50 GB of logs a month, 14-day retention), not billed for overage.
- **Never on the critical path.** A failing backend degrades to stdout only and says so once.
- **Never logged stays never logged.** Redaction applies to what is exported, not only to stdout.

`@opentelemetry/instrumentation-pino` cannot help: Pino loads before `initTelemetry`, so the instrumentation never patches it (ADR-0017 disabled it for that reason).

## Decision

1. **The OpenTelemetry logs SDK, fed from Pino in-process.** When export is on, `createLogger`
   writes to a `pino.multistream` of stdout (or the caller's destination, or the pretty
   transport) and a destination that parses each serialized line and emits it through the
   global `LoggerProvider`. The line is already redacted and carries the mixin's trace
   fields, and Pino writes synchronously inside the logging call, so the record's trace
   context is the span the mixin stamped. `initTelemetry` registers the provider on the
   `NodeSDK`, so logs share the traces' resource (`service.name`, the process and host
   detectors) and its shutdown flush.
2. **The mapping.** `msg` is the body. Pino's level becomes the OTel severity number, its
   label the severity text. `time` is the timestamp. Every other key is an attribute,
   unchanged, `err` as a nested map, except what the record or the resource already
   carries: `trace_id`/`span_id`, `service.name` and `pid` (`process.pid`).
3. **Opt-in, by standard variables.** Export is on only with `OTEL_LOGS_EXPORTER=otlp` and an
   endpoint: `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`, else `OTEL_EXPORTER_OTLP_ENDPOINT`. The OTel
   default for `OTEL_LOGS_EXPORTER` is `otlp`; ours is off, so a deploy that already exports
   traces does not start spending log quota unannounced. Off means no multistream, no
   exporter and no connection: stdout is byte-for-byte what it was.
4. **Failures are reported once per outage.** The OTLP exporter is wrapped: the first failed
   batch writes `otel.log_export.failed` (`warn`, with `err`), the first success after it
   `otel.log_export.restored` (`info`). Every batch is answered as a success to the batch
   processor, which would otherwise report each failed batch again through `diag`. Both
   lines are written under the root context, since the batch timer runs in whichever
   request's context started it.
5. **The pipeline's own lines are not exported.** Lines from `nebula.component: otel` (SDK
   diagnostics, the export failure lines, `otel.start.failed`) stay on stdout. Exported,
   each failed export would produce a line that becomes the next failed export, and at
   `OTEL_LOG_LEVEL=debug` the exporter logs every payload it sends.

## Considered options

- **`pino-opentelemetry-transport`** (a Pino transport speaking OTLP from a worker thread). Keeps parsing and export off the event loop. Rejected: a failure inside the worker cannot write the one `warn` the main logger owes without a channel back; it builds its own resource, separate from the traces'; and its behaviour can only be tested across a thread boundary, not with an in-memory exporter.
- **`@opentelemetry/instrumentation-pino`'s log sending.** Rejected for the reason ADR-0017 disabled it: it never patches a Pino loaded before the SDK.
- **The spec default (export whenever an endpoint is set).** Rejected: production already sets `OTEL_EXPORTER_OTLP_ENDPOINT` for traces, so merging would have turned log export on without anyone choosing to spend the quota.
- **Exporting every line, the pipeline's own included.** Rejected: see decision 5.
- **An OpenTelemetry Collector tailing stdout.** Rejected for the reasons in ADR-0007: a second always-on Render service on a free plan.

## Consequences

- **Positive:** a trace in Tempo opens its log lines in Loki, and a Loki line links to its trace; logs from every service are queryable in one place, with the same `event.name` and attribute names as stdout. The same dashboard JSON (`grafana/dashboards/`) runs against local `otel-lgtm` and Grafana Cloud.
- **Negative / tradeoffs:**
  - Every line is parsed back from JSON on the main thread. Cheap at one `info` line per unit of work; it would matter at `trace` under load.
  - Lines written before `initTelemetry` registers the provider are not exported. Today that is none: nothing logs between `createLogger` and `initTelemetry` in `server.ts`.
  - A batch lost to an outage is not retried beyond the exporter's own retries; stdout keeps it.
  - `otel.diag.log` lines are not in Loki. Read SDK trouble on stdout.
  - Volume: an exported line measured about 1.4 KB in local Loki once structured metadata is counted (mostly the resource: process and host attributes). 50 GB a month is about 35 million lines, around 13 a second sustained, against roughly one `info` line per request today. Turning a component to `debug` at runtime (ADR-0020) multiplies that while it lasts, and the change expires on its own.
- **Neutral:** `@nebula-chat/otel` gains `@opentelemetry/api-logs`, `@opentelemetry/sdk-logs`, `@opentelemetry/exporter-logs-otlp-http` and `@opentelemetry/core`, all already in the SDK's dependency graph. No change to call sites, the line shape or the OpenAPI contract.
