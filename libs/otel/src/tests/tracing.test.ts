import { trace } from '@opentelemetry/api';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../logger';
import { initTelemetry } from '../tracing';
import { captureDestination } from './capture';

// The OTLP exporter is the network boundary: constructing one is what would
// open a connection. Faked so the tests can see whether one was built, and so
// nothing here ever dials a collector.
const exporterConstructed = vi.fn();
vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: class {
    constructor() {
      exporterConstructed();
    }
    export() {}
    shutdown() {
      return Promise.resolve();
    }
  },
}));

const ENDPOINT = 'OTEL_EXPORTER_OTLP_ENDPOINT';
const originalEndpoint = process.env[ENDPOINT];

const restoreEndpoint = () => {
  if (originalEndpoint === undefined) delete process.env[ENDPOINT];
  else process.env[ENDPOINT] = originalEndpoint;
};

const capture = () => {
  const { lines, destination } = captureDestination();
  return {
    logger: createLogger({ serviceName: 'test-service', level: 'trace', destination }),
    lines,
  };
};

describe('initTelemetry with no OTLP endpoint', () => {
  const { logger, lines } = capture();

  beforeAll(() => {
    delete process.env[ENDPOINT];
    initTelemetry('test-service', { logger });
    restoreEndpoint();
  });

  afterEach(() => {
    lines.length = 0;
  });

  it('stamps trace_id and span_id on a line written inside an active span', () => {
    const ids = trace.getTracer('test').startActiveSpan('unit-of-work', (span) => {
      logger.info('inside the span');
      span.end();
      return span.spanContext();
    });

    expect(lines[0]).toMatchObject({ trace_id: ids.traceId, span_id: ids.spanId });
    expect(ids.traceId).toMatch(/^[0-9a-f]{32}$/);
  });

  it('stamps the current span on a child logger too', () => {
    trace.getTracer('test').startActiveSpan('outer', (span) => {
      logger.child({ 'nebula.component': 'redis' }).warn('from a child');
      span.end();
    });

    expect(lines[0]).toHaveProperty('trace_id');
    expect(lines[0]).toHaveProperty('span_id');
  });

  it('writes no trace fields outside a span', () => {
    logger.info('outside any span');

    expect(lines[0]).not.toHaveProperty('trace_id');
    expect(lines[0]).not.toHaveProperty('span_id');
  });

  it('builds no exporter, so nothing tries to connect', () => {
    expect(exporterConstructed).not.toHaveBeenCalled();
  });
});

describe('initTelemetry against a stubbed SDK', () => {
  const stubSdk = (start: () => void) => {
    vi.resetModules();
    vi.doMock('@opentelemetry/sdk-node', () => ({
      NodeSDK: class {
        start = start;
        shutdown() {
          return Promise.resolve();
        }
      },
    }));
    return import('../tracing');
  };

  afterEach(() => {
    vi.doUnmock('@opentelemetry/sdk-node');
    restoreEndpoint();
    exporterConstructed.mockClear();
  });

  it('builds the OTLP exporter when an endpoint is set', async () => {
    process.env[ENDPOINT] = 'http://collector.invalid:4318';
    const { initTelemetry: init } = await stubSdk(() => undefined);

    init('test-service', { logger: capture().logger });

    expect(exporterConstructed).toHaveBeenCalledOnce();
  });

  it('logs a warning and carries on when the SDK fails to start', async () => {
    delete process.env[ENDPOINT];
    const { initTelemetry: init } = await stubSdk(() => {
      throw new Error('instrumentation exploded');
    });
    const { logger, lines } = capture();

    expect(() => init('test-service', { logger })).not.toThrow();

    const failures = lines.filter((l) => l['event.name'] === 'otel.start.failed');
    expect(failures).toEqual([
      expect.objectContaining({
        level: 40,
        'nebula.component': 'otel',
        err: expect.objectContaining({ message: 'instrumentation exploded' }),
      }),
    ]);
  });
});
