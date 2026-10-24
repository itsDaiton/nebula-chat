import type { DestinationStream } from 'pino';
import type { LogEventName } from './events';
import { createLogger } from './logger';
import type { Logger } from './logger';

/** One parsed JSON log line, as a reader of the logs would see it. */
export type LogLine = Record<string, unknown> & { level: number; msg: string };

/** Pino's numeric levels, so assertions read as words. */
export const LEVEL = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 } as const;

/**
 * An in-memory Pino destination whose lines are parsed back to objects, so tests assert on emitted JSON, not on which method was called.
 */
export const captureDestination = (): { lines: LogLine[]; destination: DestinationStream } => {
  const lines: LogLine[] = [];
  return {
    lines,
    destination: {
      write: (chunk: string) => {
        lines.push(JSON.parse(chunk) as LogLine);
      },
    },
  };
};

/**
 * A real logger writing parsed lines to memory, at `trace` so nothing is filtered before the assertion sees it.
 */
export const captureLogger = (level = 'trace'): { logger: Logger; lines: LogLine[] } => {
  const { lines, destination } = captureDestination();
  const logger = createLogger({ serviceName: 'nebula-chat-test', level, destination });
  return { logger, lines };
};

/** The lines stamped with one event name. */
export const eventLines = (lines: LogLine[], event: LogEventName): LogLine[] =>
  lines.filter((line) => line['event.name'] === event);
