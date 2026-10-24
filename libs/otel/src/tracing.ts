import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { NodeSDK } from '@opentelemetry/sdk-node';
import type { NodeSDKConfiguration } from '@opentelemetry/sdk-node';
import { componentLogger } from './componentLogger';
import { attachDiagLogger } from './diag';
import { isLogExportEnabled, reportExportFailures } from './logExport';
import { logEvent } from './logEvent';
import { createLogger } from './logger';
import type { Logger } from './logger';

type InitTelemetryOptions = {
  /**
   * Logger the SDK's diagnostics go through; pass the caller's so the process keeps one Pino logger.
   */
  logger?: Logger;
  /** Overrides `process.env.OTEL_LOG_LEVEL`. */
  diagLevel?: string;
};

type SpanProcessor = NonNullable<NodeSDKConfiguration['spanProcessors']>[number];

/**
 * A span processor that drops every span; registering one makes the SDK install a real tracer, so lines still get a `trace_id`.
 */
const discardingSpanProcessor: SpanProcessor = {
  onStart: () => undefined,
  onEnd: () => undefined,
  forceFlush: () => Promise.resolve(),
  shutdown: () => Promise.resolve(),
};

// No endpoint pins spans and metrics to nothing (unset, `NodeSDK` defaults to OTLP at
// localhost). Logs are always explicit and go out only on the opt-in (ADR-0023).
const exportConfiguration = (logger: Logger): Partial<NodeSDKConfiguration> => ({
  ...(process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? { traceExporter: new OTLPTraceExporter() }
    : { spanProcessors: [discardingSpanProcessor], metricReaders: [] }),
  logRecordProcessors: isLogExportEnabled()
    ? [
        new BatchLogRecordProcessor({
          exporter: reportExportFailures(new OTLPLogExporter(), logger),
        }),
      ]
    : [],
});

// Where an endpoint points, without the userinfo or path a URL can carry. A bare
// `localhost:4318` parses with the scheme `localhost:` and the origin "null".
const destination = (endpoint: string): string => {
  const origin = URL.canParse(endpoint) ? new URL(endpoint).origin : 'null';
  return origin === 'null' ? 'an endpoint with no http(s) origin' : origin;
};

/** What `exportConfiguration` set up, in words; `undefined` when nothing is exported. */
const exportSummary = (): string | undefined => {
  const env = process.env;
  const traces =
    env.OTEL_EXPORTER_OTLP_ENDPOINT &&
    destination(env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || env.OTEL_EXPORTER_OTLP_ENDPOINT);
  const logs =
    isLogExportEnabled() &&
    destination(env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || env.OTEL_EXPORTER_OTLP_ENDPOINT || '');
  if (traces && logs) {
    return traces === logs
      ? `Exporting traces and logs over OTLP to ${traces}`
      : `Exporting traces over OTLP to ${traces} and logs to ${logs}`;
  }
  if (traces) {
    return `Exporting traces over OTLP to ${traces}; logs stay on stdout until OTEL_LOGS_EXPORTER=otlp`;
  }
  if (logs) {
    return `Exporting logs over OTLP to ${logs}; traces are not exported without OTEL_EXPORTER_OTLP_ENDPOINT`;
  }
  return undefined;
};

let sdk: NodeSDK | null = null;
let shutdownPromise: Promise<void> | null = null;

/**
 * How long shutdown waits on the span flush: an unreachable collector makes the exporter retry for ~8s, and `tsx watch` waits on that exit.
 */
export const SHUTDOWN_FLUSH_CAP_MS = 2_000;

/**
 * Flushes pending spans and stops the SDK, giving up after `SHUTDOWN_FLUSH_CAP_MS`. Never rejects (a failed flush is reported through `diag`),
 * is idempotent, and resolves at once if the SDK never started.
 */
export const shutdownTelemetry = (): Promise<void> => {
  if (!sdk) return Promise.resolve();
  if (!shutdownPromise) {
    let timer: NodeJS.Timeout | undefined;
    const cap = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, SHUTDOWN_FLUSH_CAP_MS);
    });
    const flush = sdk.shutdown().catch(() => undefined);
    shutdownPromise = Promise.race([flush, cap]).finally(() => clearTimeout(timer));
  }
  return shutdownPromise;
};

/**
 * Starts the OTel Node SDK with auto-instrumentations; the tracer is always on and `OTEL_EXPORTER_OTLP_ENDPOINT` only decides export.
 * Reads `process.env` directly (a lib can't use a consumer's env schema, ADR-0007) and must run before the modules it instruments load.
 */
export const initTelemetry = (serviceName: string, options: InitTelemetryOptions = {}): void => {
  const logger = options.logger ?? createLogger({ serviceName });
  const instance = new NodeSDK({
    serviceName,
    ...exportConfiguration(logger),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Pino loads before this runs, and `createLogger` stamps trace ids and exports
        // lines itself, so this instrumentation could only add duplicate keys.
        '@opentelemetry/instrumentation-pino': { enabled: false },
      }),
    ],
  });

  // After the constructor, before `start()`: `new NodeSDK()` installs its own console logger when `OTEL_LOG_LEVEL` is set and would overwrite an earlier one,
  // while boot diagnostics still reach Pino.
  attachDiagLogger(logger, options.diagLevel ?? process.env.OTEL_LOG_LEVEL);

  try {
    instance.start();
  } catch (error) {
    // Observability must never take the service down: a failed SDK start degrades to no tracing (`warn`) and leaves `sdk` null, so no SIGTERM handler is registered.
    logEvent(
      componentLogger(logger, 'otel'),
      'warn',
      'otel.start.failed',
      { err: error },
      'OpenTelemetry SDK failed to start; continuing without tracing',
    );
    return;
  }

  sdk = instance;

  // One line that answers "is anything leaving?" at boot. None when nothing is
  // exported, so a process without an endpoint writes exactly what it did before.
  const summary = exportSummary();
  if (summary) logEvent(componentLogger(logger, 'otel'), 'info', 'otel.started', {}, summary);

  process.on('SIGTERM', () => {
    void shutdownTelemetry();
  });
};
