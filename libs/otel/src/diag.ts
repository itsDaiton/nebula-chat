import { diag, DiagLogLevel } from '@opentelemetry/api';
import type { DiagLogger } from '@opentelemetry/api';
import type pino from 'pino';
import type { Logger } from './logger';

/**
 * The OTel-standard `OTEL_LOG_LEVEL` value set.
 * @see https://opentelemetry.io/docs/languages/js/instrumentation/#diagnostic-logging
 */
type DiagLevelName = 'none' | 'error' | 'warn' | 'info' | 'debug' | 'verbose' | 'all';

const DIAG_LEVELS: Record<DiagLevelName, DiagLogLevel> = {
  none: DiagLogLevel.NONE,
  error: DiagLogLevel.ERROR,
  warn: DiagLogLevel.WARN,
  info: DiagLogLevel.INFO,
  debug: DiagLogLevel.DEBUG,
  verbose: DiagLogLevel.VERBOSE,
  all: DiagLogLevel.ALL,
};

const isDiagLevelName = (value: string): value is DiagLevelName => value in DIAG_LEVELS;

/**
 * Maps an `OTEL_LOG_LEVEL`-style string onto a `DiagLogLevel`, case-insensitively.
 *
 * An unknown or absent value resolves to `ERROR`, not `NONE`: the SDK reports
 * its own failures (unreachable endpoint, exporter rejections, instrumentation
 * faults) through `diag`, and defaulting to silence is what makes a broken
 * exporter invisible.
 */
export const resolveDiagLevel = (raw?: string): DiagLogLevel => {
  const name = raw?.trim().toLowerCase();
  return name !== undefined && isDiagLevelName(name) ? DIAG_LEVELS[name] : DiagLogLevel.ERROR;
};

/**
 * Pino levels OTel's five `DiagLogger` methods map onto. Pino has no `verbose`,
 * so the most detailed OTel level lands on `trace`.
 */
type PinoDiagLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

/**
 * Lowest Pino level the diag child must allow for a given `DiagLogLevel`.
 *
 * `diag.setLogger`'s own level stops OTel calling the adapter below the chosen
 * level, but Pino filters independently: a child inherits its parent's level, so
 * without this the parent's `LOG_LEVEL` (default `info`) would silently swallow
 * every `debug`/`verbose` diagnostic no matter what `OTEL_LOG_LEVEL` asked for.
 * Setting it on the child makes `OTEL_LOG_LEVEL` effective on its own.
 */
const childLevelFor = (level: DiagLogLevel): pino.Level | 'silent' => {
  if (level >= DiagLogLevel.VERBOSE) return 'trace';
  if (level >= DiagLogLevel.DEBUG) return 'debug';
  if (level >= DiagLogLevel.INFO) return 'info';
  if (level >= DiagLogLevel.WARN) return 'warn';
  if (level >= DiagLogLevel.ERROR) return 'error';
  return 'silent';
};

/**
 * `DiagLogger` passes a message plus loose extra args. Pino v10 derives its
 * variadic args from the message's literal format string, so a non-literal
 * message accepts none — the extras go in a bound object instead of being
 * interpolated.
 */
const emit = (logger: Logger, level: PinoDiagLevel, message: string, args: unknown[]): void => {
  if (args.length === 0) {
    logger[level](message);
    return;
  }
  logger[level]({ args }, message);
};

/**
 * Routes OpenTelemetry's internal diagnostics into the given Pino logger, tagged
 * `component: 'otel'` so SDK noise stays filterable in aggregated logs.
 *
 * Deliberately not `DiagConsoleLogger`: that writes to `console.*`, which would
 * bypass the very logging pipeline this lib exists to provide.
 *
 * Call this *after* the `NodeSDK` constructor — it installs its own
 * `DiagConsoleLogger` when `OTEL_LOG_LEVEL` is set, and would overwrite an
 * adapter attached earlier.
 */
export const attachDiagLogger = (logger: Logger, raw?: string): void => {
  const logLevel = resolveDiagLevel(raw);
  // The child carries its own level so OTEL_LOG_LEVEL works independently of
  // the app's LOG_LEVEL — see childLevelFor.
  const diagLog = logger.child({ component: 'otel' }, { level: childLevelFor(logLevel) });

  const adapter: DiagLogger = {
    error: (message, ...args) => emit(diagLog, 'error', message, args),
    warn: (message, ...args) => emit(diagLog, 'warn', message, args),
    info: (message, ...args) => emit(diagLog, 'info', message, args),
    debug: (message, ...args) => emit(diagLog, 'debug', message, args),
    verbose: (message, ...args) => emit(diagLog, 'trace', message, args),
  };

  // `suppressOverrideMessage`: the NodeSDK constructor registers its own
  // DiagConsoleLogger whenever OTEL_LOG_LEVEL is set, so this call is usually an
  // override. Without the flag the API announces that through the logger it is
  // about to replace — i.e. a raw stack trace on the console, the exact output
  // this adapter exists to avoid.
  diag.setLogger(adapter, {
    logLevel,
    suppressOverrideMessage: true,
  });
};
