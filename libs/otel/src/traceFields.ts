import { isSpanContextValid, trace } from '@opentelemetry/api';

type TraceFields = { trace_id?: string; span_id?: string };

/**
 * The Pino `mixin`: stamps `trace_id`/`span_id` on every line written inside an
 * active, valid span. Read through `@opentelemetry/api` at write time rather
 * than via `@opentelemetry/instrumentation-pino` — Pino is loaded through this
 * lib *before* `initTelemetry` runs, so that instrumentation never patches it.
 *
 * Returns nothing outside a span, or before the SDK has registered a context
 * manager (the API's no-op one never has an active span).
 */
export const traceFields = (): TraceFields => {
  const spanContext = trace.getActiveSpan()?.spanContext();
  if (!spanContext || !isSpanContextValid(spanContext)) {
    return {};
  }
  return { trace_id: spanContext.traceId, span_id: spanContext.spanId };
};
