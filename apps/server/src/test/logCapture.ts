import { createLogger } from '@nebula-chat/otel';
import type { LogEventName, Logger } from '@nebula-chat/otel';

/** One parsed JSON log line, as a reader of the logs would see it. */
export type LogLine = Record<string, unknown> & { level: number; msg: string };

/** Pino's numeric levels, so assertions read as words. */
export const LEVEL = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 } as const;

/**
 * A real `@nebula-chat/otel` logger writing parsed lines to memory. Tests
 * assert on the emitted lines — event name, level, attributes, how many —
 * never on which function logged. Defaults to `trace` so nothing is filtered
 * before the assertion sees it.
 */
export const captureLogger = (level = 'trace'): { logger: Logger; lines: LogLine[] } => {
  const lines: LogLine[] = [];
  const logger = createLogger({
    serviceName: 'nebula-chat-server-test',
    level,
    destination: { write: (chunk: string) => lines.push(JSON.parse(chunk) as LogLine) },
  });
  return { logger, lines };
};

/** The lines stamped with one event name. */
export const eventLines = (lines: LogLine[], event: LogEventName): LogLine[] =>
  lines.filter((line) => line['event.name'] === event);
