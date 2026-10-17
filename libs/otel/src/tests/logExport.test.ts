import { trace } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import type { ReadableLogRecord } from '@opentelemetry/sdk-logs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { LOG_EXPORT_TIMEOUT_MS } from '../logExport';
import { logEvent } from '../logEvent';
import { createLogger } from '../logger';
import { initTelemetry } from '../tracing';
import { captureDestination } from './capture';
import type { LogLine } from './capture';
import { setEnv } from './processEnv';

// The OTLP exporters are the network boundary: the log one becomes an in-memory one whose
// outcome each test picks, the trace one is faked so an endpoint never dials a collector.
type ExportOutcome = 'succeed' | 'fail' | 'throw' | 'hang';
const exporter = vi.hoisted(() => ({
  outcome: 'succeed' as ExportOutcome,
  records: [] as ReadableLogRecord[],
}));

vi.mock('@opentelemetry/exporter-logs-otlp-http', () => ({
  OTLPLogExporter: class {
    export(batch: ReadableLogRecord[], done: (result: { code: number; error?: Error }) => void) {
      if (exporter.outcome === 'throw') throw new Error('exporter exploded');
      if (exporter.outcome === 'hang') return;
      if (exporter.outcome === 'fail') {
        done({ code: 1, error: new Error('collector unreachable') });
        return;
      }
      exporter.records.push(...batch);
      done({ code: 0 });
    }
    shutdown() {
      return Promise.resolve();
    }
  },
}));

vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: class {
    export() {}
    shutdown() {
      return Promise.resolve();
    }
  },
}));

const NO_EXPORT_ENV = {
  OTEL_LOGS_EXPORTER: undefined,
  OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
  OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: undefined,
};
type ExportEnv = Partial<Record<keyof typeof NO_EXPORT_ENV, string>>;

const EXPORT_ENV: ExportEnv = {
  OTEL_LOGS_EXPORTER: 'otlp',
  OTEL_EXPORTER_OTLP_ENDPOINT: 'http://collector.invalid:4318',
};

/** Runs `run` with exactly `values` set among the export variables. */
const withEnv = <T>(values: ExportEnv, run: () => T): T => {
  const restore = setEnv({ ...NO_EXPORT_ENV, ...values });
  try {
    return run();
  } finally {
    restore();
  }
};

const captureLogger = (env: ExportEnv = EXPORT_ENV) => {
  const { lines, destination } = captureDestination();
  const logger = withEnv(env, () =>
    createLogger({
      serviceName: 'test-service',
      serviceVersion: '1.2.3',
      environment: 'test',
      level: 'trace',
      destination,
    }),
  );
  return { logger, lines };
};

const flushLogs = async (): Promise<void> => {
  const provider = logs.getLoggerProvider();
  if (!(provider instanceof LoggerProvider)) throw new Error('No SDK LoggerProvider registered');
  await provider.forceFlush();
};

const exportedEvent = (name: string) =>
  exporter.records.find((record) => record.attributes['event.name'] === name);

const linesOf = (lines: LogLine[], name: string) => lines.filter((l) => l['event.name'] === name);

describe('OTLP log export', () => {
  const { logger, lines } = captureLogger();

  beforeAll(() => {
    withEnv(EXPORT_ENV, () => initTelemetry('test-service', { logger }));
  });

  afterEach(async () => {
    // A delivered batch ends any outage a test left open, so the next one starts healthy.
    exporter.outcome = 'succeed';
    logEvent(logger, 'debug', 'cache.saved', {}, 'reset');
    await flushLogs();
    exporter.records.length = 0;
    lines.length = 0;
  });

  it('exports a line with its attributes, event.name, body, severity and timestamp', async () => {
    logEvent(
      logger,
      'info',
      'http.request.completed',
      { 'http.request.method': 'GET', 'http.response.status_code': 200 },
      'GET /health 200',
    );
    await flushLogs();

    const record = exportedEvent('http.request.completed');
    expect(record).toMatchObject({
      body: 'GET /health 200',
      severityNumber: SeverityNumber.INFO,
      severityText: 'info',
      attributes: {
        'event.name': 'http.request.completed',
        'http.request.method': 'GET',
        'http.response.status_code': 200,
      },
    });
    const [seconds, nanos] = record?.hrTime ?? [0, 0];
    expect(seconds * 1000 + nanos / 1e6).toBe(linesOf(lines, 'http.request.completed')[0]?.time);
  });

  it('carries the line’s trace_id and span_id as the record’s trace context', async () => {
    const ids = trace.getTracer('test').startActiveSpan('unit-of-work', (span) => {
      logEvent(logger, 'info', 'cache.hit', {}, 'inside the span');
      span.end();
      return span.spanContext();
    });
    await flushLogs();

    expect(lines[0]).toMatchObject({ trace_id: ids.traceId, span_id: ids.spanId });
    expect(exportedEvent('cache.hit')?.spanContext).toMatchObject({
      traceId: ids.traceId,
      spanId: ids.spanId,
    });
  });

  it('leaves the fields the resource or the record already carry out of the attributes', async () => {
    trace.getTracer('test').startActiveSpan('unit-of-work', (span) => {
      logEvent(logger, 'info', 'cache.hit', {}, 'inside the span');
      span.end();
    });
    await flushLogs();

    const record = exportedEvent('cache.hit');
    for (const key of ['level', 'time', 'msg', 'trace_id', 'span_id', 'service.name', 'pid']) {
      expect(record?.attributes).not.toHaveProperty([key]);
    }
    expect(record?.resource.attributes['service.name']).toBe('test-service');
    expect(record?.attributes).toMatchObject({
      'service.version': '1.2.3',
      'deployment.environment.name': 'test',
    });
  });

  it.each([
    ['trace', SeverityNumber.TRACE],
    ['debug', SeverityNumber.DEBUG],
    ['info', SeverityNumber.INFO],
    ['warn', SeverityNumber.WARN],
    ['error', SeverityNumber.ERROR],
    ['fatal', SeverityNumber.FATAL],
  ] as const)('maps the Pino level %s onto its OTel severity', async (level, severity) => {
    logEvent(logger, level, 'cache.hit', {}, `a ${level} line`);
    await flushLogs();

    expect(exportedEvent('cache.hit')).toMatchObject({
      severityNumber: severity,
      severityText: level,
    });
  });

  it('keeps err as a nested map, with its type, message and stack', async () => {
    logEvent(logger, 'error', 'http.request.failed', { err: new TypeError('boom') }, 'failed');
    await flushLogs();

    expect(exportedEvent('http.request.failed')?.attributes.err).toMatchObject({
      type: 'TypeError',
      message: 'boom',
      stack: expect.stringContaining('TypeError: boom'),
    });
  });

  it('exports the redacted value, never the secret', async () => {
    logger.info({ 'user.email': 'ada@example.com', req: { headers: { cookie: 'SECRET' } } }, 'r');
    await flushLogs();

    const [record] = exporter.records;
    expect(record?.attributes).toMatchObject({
      'user.email': '[Redacted]',
      req: { headers: { cookie: '[Redacted]' } },
    });
    expect(JSON.stringify(record?.attributes)).not.toMatch(/ada@example\.com|SECRET/);
  });

  it('keeps the export pipeline’s own lines on stdout only, so they cannot feed back into it', async () => {
    logger.child({ 'nebula.component': 'otel', 'event.name': 'otel.diag.log' }).error('sdk noise');
    await flushLogs();

    expect(linesOf(lines, 'otel.diag.log')).toHaveLength(1);
    expect(exporter.records).toEqual([]);
  });

  it('exports nothing from a logger created without the opt-in', async () => {
    const plain = captureLogger({
      OTEL_EXPORTER_OTLP_ENDPOINT: EXPORT_ENV.OTEL_EXPORTER_OTLP_ENDPOINT,
    });

    logEvent(plain.logger, 'info', 'cache.hit', {}, 'stdout only');
    await flushLogs();

    expect(plain.lines).toHaveLength(1);
    expect(exporter.records).toEqual([]);
  });

  describe('when the exporter fails', () => {
    it.each(['fail', 'throw'] as const)(
      'keeps stdout intact and warns once per outage when it %ss',
      async (outcome) => {
        exporter.outcome = outcome;

        logEvent(logger, 'info', 'cache.hit', {}, 'first');
        await flushLogs();
        logEvent(logger, 'info', 'cache.hit', {}, 'second');
        await flushLogs();

        expect(linesOf(lines, 'cache.hit').map((l) => l.msg)).toEqual(['first', 'second']);
        expect(linesOf(lines, 'otel.log_export.failed')).toEqual([
          expect.objectContaining({
            level: 40,
            'nebula.component': 'otel',
            err: expect.objectContaining({ message: expect.any(String) }),
          }),
        ]);
      },
    );

    it('treats an export that never answers as failed once it times out', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        exporter.outcome = 'hang';
        logEvent(logger, 'info', 'cache.hit', {}, 'stuck');
        const flushed = flushLogs();
        await vi.advanceTimersByTimeAsync(LOG_EXPORT_TIMEOUT_MS);
        await flushed;
      } finally {
        vi.useRealTimers();
      }

      expect(linesOf(lines, 'cache.hit')).toHaveLength(1);
      expect(linesOf(lines, 'otel.log_export.failed')).toEqual([
        expect.objectContaining({
          err: expect.objectContaining({ message: expect.stringContaining('timed out') }),
        }),
      ]);
    });

    it('writes its outage lines outside any trace, even when the export runs inside a request’s', async () => {
      exporter.outcome = 'fail';
      await trace.getTracer('test').startActiveSpan('request', async (span) => {
        logEvent(logger, 'info', 'cache.hit', {}, 'inside a request');
        await flushLogs();
        span.end();
      });

      const [warning] = linesOf(lines, 'otel.log_export.failed');
      expect(linesOf(lines, 'cache.hit')[0]).toHaveProperty('trace_id');
      expect(warning).toBeDefined();
      expect(warning).not.toHaveProperty('trace_id');
    });

    it('says so when export recovers, and warns again on the next outage', async () => {
      exporter.outcome = 'fail';
      logEvent(logger, 'info', 'cache.hit', {}, 'lost');
      await flushLogs();

      exporter.outcome = 'succeed';
      logEvent(logger, 'info', 'cache.hit', {}, 'delivered');
      await flushLogs();

      exporter.outcome = 'fail';
      logEvent(logger, 'info', 'cache.hit', {}, 'lost again');
      await flushLogs();

      expect(linesOf(lines, 'otel.log_export.restored')).toEqual([
        expect.objectContaining({ level: 30, 'nebula.component': 'otel' }),
      ]);
      expect(linesOf(lines, 'otel.log_export.failed')).toHaveLength(2);
      expect(exporter.records.map((r) => r.body)).toEqual(['delivered']);
    });
  });
});
