import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SpanKind } from '@opentelemetry/api';
import { captureSpans } from '../testing';
import { extractTraceContext, injectTraceContext, withSpan } from '../propagation';

const capture = captureSpans();
afterAll(() => capture.stop());
beforeAll(() => capture.reset());

const TRACE_ID = '0af7651916cd43dd8448eb211c80319c';
const PARENT_ID = 'b7ad6b7169203331';
const traceparent = `00-${TRACE_ID}-${PARENT_ID}-01`;

describe('injectTraceContext', () => {
  it('carries the active span as a W3C traceparent', async () => {
    const carrier = await withSpan('producer', { kind: SpanKind.PRODUCER }, async () =>
      injectTraceContext(),
    );

    const [span] = capture.spans();
    expect(carrier.traceparent).toBe(
      `00-${span!.spanContext().traceId}-${span!.spanContext().spanId}-01`,
    );
  });

  it('is empty outside a span', () => {
    expect(injectTraceContext()).toEqual({});
  });
});

describe('withSpan', () => {
  it('continues the trace of an extracted carrier as a child', async () => {
    capture.reset();

    await withSpan(
      'consumer',
      { kind: SpanKind.CONSUMER, parent: extractTraceContext({ traceparent }) },
      async () => undefined,
    );

    const [span] = capture.spans();
    expect(span!.spanContext().traceId).toBe(TRACE_ID);
    expect(span!.parentSpanContext?.spanId).toBe(PARENT_ID);
    expect(span!.kind).toBe(SpanKind.CONSUMER);
  });

  it('starts a fresh root when the carrier has no trace context', async () => {
    capture.reset();

    await withSpan('consumer', { parent: extractTraceContext({}) }, async () => undefined);

    const [span] = capture.spans();
    expect(span!.parentSpanContext).toBeUndefined();
    expect(span!.spanContext().traceId).not.toBe(TRACE_ID);
  });

  it('ignores a malformed traceparent rather than failing', async () => {
    capture.reset();

    await withSpan(
      'consumer',
      { parent: extractTraceContext({ traceparent: 'garbage' }) },
      async () => undefined,
    );

    expect(capture.spans()[0]!.parentSpanContext).toBeUndefined();
  });

  it('nests spans started inside it', async () => {
    capture.reset();

    await withSpan('outer', {}, () => withSpan('inner', {}, async () => undefined));

    const [inner, outer] = capture.spans();
    expect(inner!.parentSpanContext?.spanId).toBe(outer!.spanContext().spanId);
  });

  it('records the error, marks the span failed and rethrows', async () => {
    capture.reset();

    await expect(
      withSpan('boom', {}, async () => {
        throw new Error('nope');
      }),
    ).rejects.toThrow('nope');

    const [span] = capture.spans();
    expect(span!.status.code).toBe(2);
    expect(span!.events[0]?.name).toBe('exception');
  });

  it('returns what the callback returns and sets attributes', async () => {
    capture.reset();

    const result = await withSpan('x', { attributes: { 'a.b': 1 } }, async () => 'done');

    expect(result).toBe('done');
    expect(capture.spans()[0]!.attributes).toEqual({ 'a.b': 1 });
  });
});
