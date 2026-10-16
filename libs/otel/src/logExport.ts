import { context, ROOT_CONTEXT } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import type { AnyValueMap } from '@opentelemetry/api-logs';
import { ExportResultCode } from '@opentelemetry/core';
import type { ExportResult } from '@opentelemetry/core';
import type { LogRecordExporter, ReadableLogRecord } from '@opentelemetry/sdk-logs';
import pino from 'pino';
import type { DestinationStream } from 'pino';
import { componentLogger } from './componentLogger';
import { logEvent } from './logEvent';
import type { Logger } from './logger';

/**
 * Whether lines are exported over OTLP as well as written to stdout. Opt-in, unlike
 * the OTel default, so log volume against Grafana Cloud's hard cap is a deliberate
 * choice: `OTEL_LOGS_EXPORTER=otlp` plus somewhere to send them.
 */
export const isLogExportEnabled = (env: NodeJS.ProcessEnv = process.env): boolean => {
  const exporters = (env.OTEL_LOGS_EXPORTER ?? '')
    .split(',')
    .map((name) => name.trim().toLowerCase());
  const endpoint = env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || env.OTEL_EXPORTER_OTLP_ENDPOINT;
  return exporters.includes('otlp') && Boolean(endpoint);
};

const SEVERITY: Readonly<Record<number, SeverityNumber>> = {
  10: SeverityNumber.TRACE,
  20: SeverityNumber.DEBUG,
  30: SeverityNumber.INFO,
  40: SeverityNumber.WARN,
  50: SeverityNumber.ERROR,
  60: SeverityNumber.FATAL,
};

// The record's own fields (timestamp, severity, body, trace context), and what the
// resource already says: `service.name`, and `pid` as `process.pid`.
const NOT_ATTRIBUTES = new Set([
  'level',
  'time',
  'msg',
  'trace_id',
  'span_id',
  'service.name',
  'pid',
]);

type PinoLine = AnyValueMap & { level: number; time: number; msg?: string };

/**
 * The Pino destination that feeds each line into the OpenTelemetry logs SDK, next
 * to stdout in a multistream. It gets the serialized line, so redaction has already
 * run. The record's trace context is the active span, the same one the `traceFields`
 * mixin stamped: Pino writes synchronously inside the logging call.
 *
 * Emits through the global logger provider, which `initTelemetry` registers; lines
 * written before that go nowhere but stdout.
 */
export const logExportStream = (): DestinationStream => {
  const otelLogger = logs.getLogger('@nebula-chat/otel');
  return {
    write: (chunk: string) => {
      try {
        const line = JSON.parse(chunk) as PinoLine;
        // The export pipeline's own lines (SDK diagnostics, export failures) stay on
        // stdout: exporting them would feed every failure back into the exporter.
        if (line['nebula.component'] === 'otel') return;
        const attributes = Object.fromEntries(
          Object.entries(line).filter(([key]) => !NOT_ATTRIBUTES.has(key)),
        );
        otelLogger.emit({
          timestamp: line.time,
          severityNumber: SEVERITY[line.level],
          severityText: pino.levels.labels[line.level],
          body: line.msg,
          attributes,
        });
      } catch {
        // Export must never break a logging call; the line is already on stdout.
      }
    },
  };
};

/**
 * Wraps the OTLP exporter so a failing backend is one `warn` per outage, written
 * to stdout, and an `info` when it recovers. Every batch is answered as a success:
 * a failure reported to the batch processor would be logged again, per batch,
 * through `diag`. A failed batch is dropped either way.
 */
export const reportExportFailures = (
  exporter: LogRecordExporter,
  logger: Logger,
): LogRecordExporter => {
  const log = componentLogger(logger, 'otel');
  let failing = false;

  // The batch timer runs in the context of whichever request started it, so
  // without the root context these lines would claim that request's trace.
  const settle = (result: ExportResult, done: (result: ExportResult) => void): void => {
    context.with(ROOT_CONTEXT, () => {
      if (result.code !== ExportResultCode.SUCCESS && !failing) {
        failing = true;
        logEvent(
          log,
          'warn',
          'otel.log_export.failed',
          { err: result.error },
          'Log export failed; logs continue on stdout only',
        );
      } else if (result.code === ExportResultCode.SUCCESS && failing) {
        failing = false;
        logEvent(log, 'info', 'otel.log_export.restored', {}, 'Log export restored');
      }
    });
    done({ code: ExportResultCode.SUCCESS });
  };

  return {
    export: (records: ReadableLogRecord[], done: (result: ExportResult) => void) => {
      try {
        exporter.export(records, (result) => settle(result, done));
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        settle({ code: ExportResultCode.FAILED, error }, done);
      }
    },
    shutdown: () => exporter.shutdown(),
    forceFlush: () => exporter.forceFlush?.() ?? Promise.resolve(),
  };
};
