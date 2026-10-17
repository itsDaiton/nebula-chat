import { trace } from '@opentelemetry/api';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../logger';
import { initTelemetry } from '../tracing';
import { captureDestination } from './capture';
import type { LogLine } from './capture';
import { setEnv } from './processEnv';

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

const logExporterConstructed = vi.fn();
vi.mock('@opentelemetry/exporter-logs-otlp-http', () => ({
  OTLPLogExporter: class {
    constructor() {
      logExporterConstructed();
    }
    export() {}
    shutdown() {
      return Promise.resolve();
    }
  },
}));

const ENDPOINT = 'OTEL_EXPORTER_OTLP_ENDPOINT';
const LOGS_ENDPOINT = 'OTEL_EXPORTER_OTLP_LOGS_ENDPOINT';
const LOGS_EXPORTER = 'OTEL_LOGS_EXPORTER';
const TRACES_ENDPOINT = 'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT';
// Each test starts with nothing configured to export; the real values come back after.
const NO_EXPORT = {
  [ENDPOINT]: undefined,
  [TRACES_ENDPOINT]: undefined,
  [LOGS_ENDPOINT]: undefined,
  [LOGS_EXPORTER]: undefined,
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
    const restoreExportEnv = setEnv(NO_EXPORT);
    initTelemetry('test-service', { logger });
    restoreExportEnv();
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
    expect(logExporterConstructed).not.toHaveBeenCalled();
  });
});

describe('initTelemetry against a stubbed SDK', () => {
  const sdkShutdown = vi.fn(() => Promise.resolve());

  const stubSdk = (start: () => void) => {
    vi.resetModules();
    vi.doMock('@opentelemetry/sdk-node', () => ({
      NodeSDK: class {
        start = start;
        shutdown = sdkShutdown;
      },
    }));
    return import('../tracing');
  };

  let restoreExportEnv = (): void => undefined;

  beforeEach(() => {
    restoreExportEnv = setEnv(NO_EXPORT);
  });

  afterEach(() => {
    vi.doUnmock('@opentelemetry/sdk-node');
    restoreExportEnv();
    exporterConstructed.mockClear();
    logExporterConstructed.mockClear();
    sdkShutdown.mockClear();
  });

  it('builds the OTLP exporter when an endpoint is set', async () => {
    process.env[ENDPOINT] = 'http://collector.invalid:4318';
    const { initTelemetry: init } = await stubSdk(() => undefined);

    init('test-service', { logger: capture().logger });

    expect(exporterConstructed).toHaveBeenCalledOnce();
  });

  it('builds no log exporter for an endpoint alone: log export is opt-in', async () => {
    process.env[ENDPOINT] = 'http://collector.invalid:4318';
    const { initTelemetry: init } = await stubSdk(() => undefined);

    init('test-service', { logger: capture().logger });

    expect(logExporterConstructed).not.toHaveBeenCalled();
  });

  it('builds no log exporter for the opt-in alone, with nowhere to send to', async () => {
    process.env[LOGS_EXPORTER] = 'otlp';
    const { initTelemetry: init } = await stubSdk(() => undefined);

    init('test-service', { logger: capture().logger });

    expect(logExporterConstructed).not.toHaveBeenCalled();
  });

  it.each([
    ['the shared endpoint', ENDPOINT],
    ['a logs-only endpoint', LOGS_ENDPOINT],
  ])('builds the OTLP log exporter for OTEL_LOGS_EXPORTER=otlp and %s', async (_label, key) => {
    process.env[key] = 'http://collector.invalid:4318';
    process.env[LOGS_EXPORTER] = 'otlp';
    const { initTelemetry: init } = await stubSdk(() => undefined);

    init('test-service', { logger: capture().logger });

    expect(logExporterConstructed).toHaveBeenCalledOnce();
  });

  describe('says where it exports once started', () => {
    const startedLines = (lines: LogLine[]) =>
      lines.filter((l) => l['event.name'] === 'otel.started');

    const start = async (env: Partial<Record<string, string>>) => {
      Object.assign(process.env, env);
      const { initTelemetry: init } = await stubSdk(() => undefined);
      const { logger, lines } = capture();
      init('test-service', { logger });
      return startedLines(lines);
    };

    it('names both signals and the collector when traces and logs go out', async () => {
      const started = await start({
        [ENDPOINT]: 'http://collector.invalid:4318',
        [LOGS_EXPORTER]: 'otlp',
      });

      expect(started).toEqual([
        expect.objectContaining({
          level: 30,
          'nebula.component': 'otel',
          msg: 'Exporting traces and logs over OTLP to http://collector.invalid:4318',
        }),
      ]);
    });

    it('says logs stay on stdout, and how to send them, when only traces go out', async () => {
      const started = await start({ [ENDPOINT]: 'http://collector.invalid:4318' });

      expect(started).toEqual([
        expect.objectContaining({
          msg: 'Exporting traces over OTLP to http://collector.invalid:4318; logs stay on stdout until OTEL_LOGS_EXPORTER=otlp',
        }),
      ]);
    });

    it('names each destination when traces and logs go to different places', async () => {
      const started = await start({
        [ENDPOINT]: 'http://collector.invalid:4318',
        [LOGS_ENDPOINT]: 'https://logs.invalid/otlp/v1/logs',
        [LOGS_EXPORTER]: 'otlp',
      });

      expect(started[0]?.msg).toBe(
        'Exporting traces over OTLP to http://collector.invalid:4318 and logs to https://logs.invalid',
      );
    });

    it('says traces are not exported when only logs go out', async () => {
      const started = await start({
        [LOGS_ENDPOINT]: 'https://logs.invalid/otlp/v1/logs',
        [LOGS_EXPORTER]: 'otlp',
      });

      expect(started[0]?.msg).toBe(
        'Exporting logs over OTLP to https://logs.invalid; traces are not exported without OTEL_EXPORTER_OTLP_ENDPOINT',
      );
    });

    it('shows only where an endpoint points, never credentials or a path in it', async () => {
      const started = await start({ [ENDPOINT]: 'https://user:s3cret@collector.invalid/otlp' });

      expect(started[0]?.msg).toContain('to https://collector.invalid;');
      expect(JSON.stringify(started)).not.toContain('s3cret');
    });

    it.each(['localhost:4318', 'not a url'])(
      'flags %s as an endpoint with no http(s) origin, which the exporter cannot reach',
      async (endpoint) => {
        const started = await start({ [ENDPOINT]: endpoint });

        expect(started[0]?.msg).toContain('to an endpoint with no http(s) origin;');
      },
    );

    it('writes nothing with no endpoint, so stdout stays as it was', async () => {
      expect(await start({})).toEqual([]);
    });
  });

  it('logs a warning and carries on when the SDK fails to start', async () => {
    const { initTelemetry: init } = await stubSdk(() => {
      throw new Error('instrumentation exploded');
    });
    const { logger, lines } = capture();

    expect(() => init('test-service', { logger })).not.toThrow();

    const failures = lines.filter((l) => l['event.name'] === 'otel.start.failed');
    expect(lines.filter((l) => l['event.name'] === 'otel.started')).toEqual([]);
    expect(failures).toEqual([
      expect.objectContaining({
        level: 40,
        'nebula.component': 'otel',
        err: expect.objectContaining({ message: 'instrumentation exploded' }),
      }),
    ]);
  });

  it('shuts the SDK down once, however many times shutdownTelemetry is called', async () => {
    const { initTelemetry: init, shutdownTelemetry } = await stubSdk(() => undefined);
    init('test-service', { logger: capture().logger });

    await Promise.all([shutdownTelemetry(), shutdownTelemetry()]);

    expect(sdkShutdown).toHaveBeenCalledOnce();
  });

  it('resolves without touching the SDK when it never started', async () => {
    const { initTelemetry: init, shutdownTelemetry } = await stubSdk(() => {
      throw new Error('instrumentation exploded');
    });
    init('test-service', { logger: capture().logger });

    await expect(shutdownTelemetry()).resolves.toBeUndefined();
    expect(sdkShutdown).not.toHaveBeenCalled();
  });

  it('stops waiting on a flush that outlives the cap, so a dead collector cannot hold up exit', async () => {
    vi.useFakeTimers();
    try {
      const {
        initTelemetry: init,
        shutdownTelemetry,
        SHUTDOWN_FLUSH_CAP_MS,
      } = await stubSdk(() => undefined);
      sdkShutdown.mockImplementationOnce(() => new Promise<void>(() => undefined));
      init('test-service', { logger: capture().logger });

      const settled = vi.fn();
      void shutdownTelemetry().then(settled);
      await vi.advanceTimersByTimeAsync(SHUTDOWN_FLUSH_CAP_MS - 1);
      expect(settled).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(settled).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('resolves when the flush fails: observability never fails the shutdown', async () => {
    const { initTelemetry: init, shutdownTelemetry } = await stubSdk(() => undefined);
    sdkShutdown.mockImplementationOnce(() => Promise.reject(new Error('collector refused')));
    init('test-service', { logger: capture().logger });

    await expect(shutdownTelemetry()).resolves.toBeUndefined();
  });
});
