import {
  context,
  defaultTextMapGetter,
  defaultTextMapSetter,
  ROOT_CONTEXT,
  SpanStatusCode,
  trace,
} from '@opentelemetry/api';
import type { Attributes, Context, Span, SpanKind } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

/** The W3C trace context as plain strings: what rides in a job payload. */
export type TraceCarrier = { traceparent?: string | undefined; tracestate?: string | undefined };

// Explicit rather than the global propagator, so it works the same whatever the SDK configured.
const propagator = new W3CTraceContextPropagator();

/** The active span as a carrier; empty outside a span. */
export const injectTraceContext = (): TraceCarrier => {
  const carrier: TraceCarrier = {};
  propagator.inject(context.active(), carrier, defaultTextMapSetter);
  return carrier;
};

/** The context a carrier describes; a root context when it has none, or a malformed one. */
export const extractTraceContext = (carrier: TraceCarrier): Context =>
  propagator.extract(ROOT_CONTEXT, carrier, defaultTextMapGetter);

type WithSpanOptions = {
  kind?: SpanKind;
  attributes?: Attributes;
  /** The context the span starts in; defaults to the active one. */
  parent?: Context;
};

/** Runs `fn` inside a new active span that ends with it, recording a thrown error before rethrowing. */
export const withSpan = <T>(
  name: string,
  { kind, attributes, parent = context.active() }: WithSpanOptions,
  fn: (span: Span) => Promise<T>,
): Promise<T> =>
  trace
    .getTracer('nebula-chat')
    .startActiveSpan(name, { kind, attributes }, parent, async (span) => {
      try {
        return await fn(span);
      } catch (error) {
        span.recordException(error instanceof Error ? error : String(error));
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
