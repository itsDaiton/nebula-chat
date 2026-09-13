import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { attachDiagLogger } from './diag';
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

let sdk: NodeSDK | null = null;

/**
 * Initialises the OpenTelemetry Node SDK with auto-instrumentations and an OTLP
 * trace exporter. A silent no-op when `OTEL_EXPORTER_OTLP_ENDPOINT` is unset.
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
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return;

  const logger = options.logger ?? createLogger();
  const instance = new NodeSDK({
    serviceName,
    traceExporter: new OTLPTraceExporter(),
    instrumentations: [getNodeAutoInstrumentations()],
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
    // throwing) degrades us to no tracing, loudly, rather than aborting boot.
    // `sdk` stays null so no SIGTERM handler is registered for a dead SDK.
    logger.error(
      { err: error, component: 'otel' },
      'OpenTelemetry SDK failed to start; continuing without tracing',
    );
    return;
  }

  sdk = instance;

  process.on('SIGTERM', () => {
    void sdk?.shutdown();
  });
};
