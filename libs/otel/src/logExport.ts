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

/** Opt-in, unlike the OTel default, so spending log quota is a choice (ADR-0023). */
export const isLogExportEnabled = (): boolean =>
  process.env.OTEL_LOGS_EXPORTER?.trim() === 'otlp' &&
  Boolean(process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT);

/** Above the OTLP exporter's own 10 s timeout, below the batch processor's 30 s. */
export const LOG_EXPORT_TIMEOUT_MS = 15_000;

const SEVERITY: Readonly<Record<number, SeverityNumber>> = {
  10: SeverityNumber.TRACE,
  20: SeverityNumber.DEBUG,
  30: SeverityNumber.INFO,
  40: SeverityNumber.WARN,
  50: SeverityNumber.ERROR,
  60: SeverityNumber.FATAL,
};

// The record's own fields, and what the resource carries (`pid` as `process.pid`).
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
 * Feeds each serialized (so already redacted) line to the global logger provider
 * `initTelemetry` registers. Pino writes synchronously, so the active span is the line's.
 */
export const logExportStream = (): DestinationStream => {
  const otelLogger = logs.getLogger('@nebula-chat/otel');
  return {
    write: (chunk: string) => {
      try {
        const line = JSON.parse(chunk) as PinoLine;
        // Exported, the pipeline's own lines would feed each failure back into it.
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
 * One `warn` per outage, an `info` on recovery. Every batch is answered as a success,
 * or the batch processor would report each failed one again through `diag`.
 */
export const reportExportFailures = (
  exporter: LogRecordExporter,
  logger: Logger,
): LogRecordExporter => {
  const log = componentLogger(logger, 'otel');
  let failing = false;

  const report = (result: ExportResult): void => {
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
  };

  return {
    export: (records: ReadableLogRecord[], done: (result: ExportResult) => void) => {
      let settled = false;
      const settle = (result: ExportResult): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        // The batch timer runs in whichever request's context started it; not that trace.
        context.with(ROOT_CONTEXT, () => report(result));
        done({ code: ExportResultCode.SUCCESS });
      };
      const timer = setTimeout(() => {
        const error = new Error(`Log export timed out after ${LOG_EXPORT_TIMEOUT_MS} ms`);
        settle({ code: ExportResultCode.FAILED, error });
      }, LOG_EXPORT_TIMEOUT_MS);
      timer.unref();

      try {
        exporter.export(records, settle);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        settle({ code: ExportResultCode.FAILED, error });
      }
    },
    shutdown: () => exporter.shutdown(),
    forceFlush: () => exporter.forceFlush?.() ?? Promise.resolve(),
  };
};
