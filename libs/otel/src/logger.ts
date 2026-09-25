import pino from 'pino';
import type { DestinationStream, LoggerOptions } from 'pino';
import { attachLevelOverrides } from './levelOverrides';
import type { LevelOverrides } from './levelOverrides';
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

// pino-pretty splits keys on dots to reach nested values, so a flat dotted key
// is escaped (`\.`) to be read as one key. The options cross into the transport
// worker thread, so `messageFormat` must be a template string, not a function.
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
    translateTime: 'HH:MM:ss',
    ignore: PRETTY_IGNORE,
    messageFormat: PRETTY_MESSAGE_FORMAT,
  },
};

/**
 * The only way a logger is constructed in this system. Every line it (or any
 * child) writes carries the service fields and `pid` — an explicit `base` is
 * also what drops Pino's default `hostname` — plus `trace_id`/`span_id` when
 * written inside an active span. Sensitive keys are censored (`redaction.ts`)
 * and `err` is always serialized as an object with its stack and cause.
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

  // Pino rejects a transport and a destination together; a caller-supplied
  // destination wins, since only tests and tools ask for one.
  const logger = options.destination
    ? pino(config, options.destination)
    : pino({ ...config, transport: options.pretty ? prettyTransport : undefined });

  attachLevelOverrides(logger, options.levelOverrides ?? {});
  return logger;
};
