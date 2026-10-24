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
 * Maps an `OTEL_LOG_LEVEL` string to a `DiagLogLevel`, case-insensitively; unknown or absent is `ERROR`, not `NONE`, so a broken exporter isn't invisible.
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
 * Lowest Pino level the diag child must allow for a `DiagLogLevel`: Pino filters independently, so the parent's `LOG_LEVEL`
 * would swallow `debug`/`verbose` diagnostics whatever `OTEL_LOG_LEVEL` says.
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
 * `DiagLogger` passes a message plus loose args; Pino v10 takes variadic args only from a literal format string, so extras go in a bound object.
 */
const emit = (logger: Logger, level: PinoDiagLevel, message: string, args: unknown[]): void => {
  if (args.length === 0) {
    logger[level](message);
    return;
  }
  logger[level]({ args }, message);
};

/**
 * Routes OTel's internal diagnostics into the Pino logger, stamped `otel.diag.log` from `nebula.component: otel` (not `DiagConsoleLogger`, which bypasses logging).
 * Call it after the `NodeSDK` constructor, which installs its own console logger when `OTEL_LOG_LEVEL` is set.
 */
export const attachDiagLogger = (logger: Logger, raw?: string): void => {
  const logLevel = resolveDiagLevel(raw);
  // The child carries its own level so `OTEL_LOG_LEVEL` works independently of `LOG_LEVEL` (see childLevelFor).
  const diagLog = logger.child(
    { 'nebula.component': 'otel', 'event.name': 'otel.diag.log' },
    { level: childLevelFor(logLevel) },
  );

  const adapter: DiagLogger = {
    error: (message, ...args) => emit(diagLog, 'error', message, args),
    warn: (message, ...args) => emit(diagLog, 'warn', message, args),
    info: (message, ...args) => emit(diagLog, 'info', message, args),
    debug: (message, ...args) => emit(diagLog, 'debug', message, args),
    verbose: (message, ...args) => emit(diagLog, 'trace', message, args),
  };

  // `suppressOverrideMessage`: the NodeSDK constructor usually registered a logger already, and without the flag the API announces the override as a raw console stack trace.
  diag.setLogger(adapter, {
    logLevel,
    suppressOverrideMessage: true,
  });
};
