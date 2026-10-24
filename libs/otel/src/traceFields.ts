import { isSpanContextValid, trace } from '@opentelemetry/api';

type TraceFields = { trace_id?: string; span_id?: string };

/**
 * The Pino `mixin` stamping `trace_id`/`span_id` inside an active span, read through `@opentelemetry/api` at write time:
 * Pino loads before `initTelemetry`, so `instrumentation-pino` would never patch it. Empty outside a span.
 */
export const traceFields = (): TraceFields => {
  const spanContext = trace.getActiveSpan()?.spanContext();
  if (!spanContext || !isSpanContextValid(spanContext)) {
    return {};
  }
  return { trace_id: spanContext.traceId, span_id: spanContext.spanId };
};
