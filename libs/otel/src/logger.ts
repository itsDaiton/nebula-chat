import pino from 'pino';
import type { DestinationStream, LoggerOptions } from 'pino';
import { attachLevelControl } from './levelControl';
import type { LevelOverrides } from './levelControl';
import { isLogExportEnabled, logExportStream } from './logExport';
import { REDACT_CENSOR, REDACT_PATHS } from './redaction';
import { serializeErr } from './serializeErr';
import { traceFields } from './traceFields';

export type CreateLoggerOptions = {
  /** `service.name` on every line. Required: a line that cannot say who wrote it is noise. */
  serviceName: string;
  /** `service.version` on every line. */
  serviceVersion?: string;
  /** `deployment.environment.name` on every line (e.g. `production`). */
  environment?: string;
  /** Root level. Falls back to `process.env.LOG_LEVEL`, then `info`. */
  level?: string;
  /** Per-component levels applied by `componentLogger`, e.g. `{ redis: 'debug' }`. */
  levelOverrides?: LevelOverrides;
  /** Render through `pino-pretty` (development only). Ignored when `destination` is given. */
  pretty?: boolean;
  /** Where lines go instead of stdout — tests pass an in-memory stream. */
  destination?: DestinationStream;
};

export type Logger = pino.Logger;

// pino-pretty splits keys on dots, so a flat dotted key is escaped (`\.`); the options cross into the transport worker thread,
// so `messageFormat` must be a template string, not a function.
const PRETTY_IGNORE = [
  'pid',
  'hostname',
  String.raw`service\.name`,
  String.raw`service\.version`,
  String.raw`deployment\.environment\.name`,
  String.raw`event\.name`,
].join(',');
const PRETTY_MESSAGE_FORMAT = String.raw`{if event\.name}{event\.name} · {end}{msg}`;

const prettyTransport = {
  target: 'pino-pretty',
  options: {
    colorize: true,
    // `SYS:` = local time, matching the clock `tsx watch` prints its restart line in.
    translateTime: 'SYS:HH:MM:ss',
    ignore: PRETTY_IGNORE,
    messageFormat: PRETTY_MESSAGE_FORMAT,
  },
};

// The caller's destination (tests, tools), else pino-pretty; undefined = Pino's own stdout.
const mainStream = (options: CreateLoggerOptions): DestinationStream | undefined =>
  options.destination ?? (options.pretty ? pino.transport(prettyTransport) : undefined);

const buildPino = (config: LoggerOptions, options: CreateLoggerOptions): Logger => {
  const main = mainStream(options);
  if (!isLogExportEnabled()) return main ? pino(config, main) : pino(config);
  // Both take every level: each logger filters, and a component's may sit below the root's.
  const streams = pino.multistream([
    { level: 'trace', stream: main ?? pino.destination(1) },
    { level: 'trace', stream: logExportStream() },
  ]);
  return pino(config, streams);
};

/**
 * The only way a logger is constructed: every line carries the service fields, `pid` and `trace_id`/`span_id` inside a span;
 * sensitive keys are censored (`redaction.ts`) and `err` serializes with its stack and cause.
 */
export const createLogger = (options: CreateLoggerOptions): Logger => {
  const config: LoggerOptions = {
    level: options.level ?? process.env.LOG_LEVEL ?? 'info',
    base: {
      'service.name': options.serviceName,
      'service.version': options.serviceVersion,
      'deployment.environment.name': options.environment,
      pid: process.pid,
    },
    errorKey: 'err',
    serializers: { err: serializeErr },
    redact: { paths: REDACT_PATHS, censor: REDACT_CENSOR },
    mixin: traceFields,
  };

  const logger = buildPino(config, options);
  attachLevelControl(logger, options.levelOverrides ?? {});
  return logger;
};
