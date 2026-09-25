import type { DestinationStream } from 'pino';

/** One parsed JSON log line, as a reader of the logs would see it. */
export type LogLine = Record<string, unknown> & { level: number; msg?: string };

/**
 * An in-memory Pino destination. Every line the logger writes is parsed back
 * into an object, so tests assert on the emitted JSON rather than on which
 * method was called.
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
