import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import type { NodeSDKConfiguration } from '@opentelemetry/sdk-node';
import { componentLogger } from './componentLogger';
import { attachDiagLogger } from './diag';
import { logEvent } from './logEvent';
import { createLogger } from './logger';
import type { Logger } from './logger';

type InitTelemetryOptions = {
  /**
   * Logger the SDK's own diagnostics are routed through. Pass the caller's
   * existing instance so the process keeps exactly one Pino logger; omitting it
   * falls back to a lib-created one.
   */
  logger?: Logger;
  /** Overrides `process.env.OTEL_LOG_LEVEL`. */
  diagLevel?: string;
};

type SpanProcessor = NonNullable<NodeSDKConfiguration['spanProcessors']>[number];

/**
 * A span processor that drops every span. Registering one is what makes the
 * SDK install a real tracer provider — with zero processors `NodeSDK` installs
 * none, spans stay non-recording, and no line would ever get a `trace_id`.
 */
const discardingSpanProcessor: SpanProcessor = {
  onStart: () => undefined,
  onEnd: () => undefined,
  forceFlush: () => Promise.resolve(),
  shutdown: () => Promise.resolve(),
};

/**
 * What the SDK exports to. With an endpoint, spans go over OTLP as before (the
 * exporter reads `OTEL_EXPORTER_OTLP_*` itself; metrics and logs keep the
 * SDK's env-driven defaults). Without one, every signal is pinned to *nothing*
 * explicitly: left unset, `NodeSDK` falls back to its env-driven defaults,
 * which are OTLP exporters pointed at localhost.
 */
const exportConfiguration = (endpoint: string | undefined): Partial<NodeSDKConfiguration> =>
  endpoint
    ? { traceExporter: new OTLPTraceExporter() }
    : { spanProcessors: [discardingSpanProcessor], metricReaders: [], logRecordProcessors: [] };

let sdk: NodeSDK | null = null;
let shutdownPromise: Promise<void> | null = null;

/**
 * How long a shutdown waits on the span flush. A reachable collector takes well
 * under this; an unreachable one makes the exporter retry for ~8s, holding the
 * process open — and `tsx watch` waits on that exit before every restart.
 */
export const SHUTDOWN_FLUSH_CAP_MS = 2_000;

/**
 * Flushes pending spans and stops the SDK, giving up after
 * `SHUTDOWN_FLUSH_CAP_MS`. Never rejects: a failed flush is the SDK's to report
 * through `diag`, and observability must never fail the shutdown. Idempotent —
 * the lib's own SIGTERM handler and a consumer awaiting it share one flush.
 * Resolves at once when the SDK never started.
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
 * Starts the OpenTelemetry Node SDK with auto-instrumentations. The tracer is
 * always on, so every log line written inside a span carries its `trace_id`;
 * `OTEL_EXPORTER_OTLP_ENDPOINT` only decides whether spans are exported.
 *
 * Reads `process.env` directly rather than a consumer's validated env object: a
 * published lib must not depend on one consumer's env schema, and importing one
 * would pull that consumer's `dotenv`/Zod graph in ahead of the SDK, defeating
 * the import ordering auto-instrumentation depends on. See ADR-0007.
 *
 * Must be called before the modules it instruments (`http`, `pg`, `redis`, ...)
 * are imported — auto-instrumentation patches modules as they load.
 */
export const initTelemetry = (serviceName: string, options: InitTelemetryOptions = {}): void => {
  const logger = options.logger ?? createLogger({ serviceName });
  const instance = new NodeSDK({
    serviceName,
    ...exportConfiguration(process.env.OTEL_EXPORTER_OTLP_ENDPOINT),
    instrumentations: [
      getNodeAutoInstrumentations({
        // `createLogger` stamps trace ids itself (a mixin), and Pino is loaded
        // before this runs, so the Pino instrumentation could only ever add
        // duplicate keys or ship logs over OTLP. stdout JSON is the log sink.
        '@opentelemetry/instrumentation-pino': { enabled: false },
      }),
    ],
  });

  // After the constructor, before start(): `new NodeSDK()` installs its own
  // DiagConsoleLogger when OTEL_LOG_LEVEL is set in the environment, so
  // attaching any earlier would have the SDK overwrite us and route its
  // diagnostics to the console. Still ahead of start(), so everything the SDK
  // reports while booting — resource detection, instrumentation registration,
  // the first export — lands in the Pino stream.
  attachDiagLogger(logger, options.diagLevel ?? process.env.OTEL_LOG_LEVEL);

  try {
    instance.start();
  } catch (error) {
    // Observability must never be able to take the service down. A failed SDK
    // start (bad endpoint, exporter refusing to initialise, an instrumentation
    // throwing) degrades us to no tracing rather than aborting boot — handled,
    // so `warn`. `sdk` stays null so no SIGTERM handler is registered for it.
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

  process.on('SIGTERM', () => {
    void shutdownTelemetry();
  });
};
