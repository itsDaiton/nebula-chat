import type { LogEventName } from './events';
import { logEvent } from './logEvent';
import type { Logger } from './logger';

export type ShutdownOptions = {
  logger: Logger;
  /** Everything that must finish before the process may exit: the app, the span flush. */
  close: () => Promise<void>;
  /** The event logged when `close` rejects, e.g. `server.shutdown.failed`. */
  failedEvent: LogEventName;
  exit?: (code: number) => void;
  /** Exit 1 this long after the first signal if `close` has not settled; a second signal then exits at once. Unset = wait forever. */
  graceMs?: number;
};

/**
 * Builds the SIGTERM/SIGINT handler: exits as soon as `close` settles rather than waiting for the event loop (`tsx watch` waits on that exit).
 * A second signal mid-shutdown is ignored unless `graceMs` is set.
 */
export const createShutdown = ({
  logger,
  close,
  failedEvent,
  exit = (code) => process.exit(code),
  graceMs,
}: ShutdownOptions): (() => void) => {
  let started = false;

  return () => {
    if (started) {
      if (graceMs !== undefined) exit(1);
      return;
    }
    started = true;

    const timer =
      graceMs === undefined
        ? undefined
        : setTimeout(() => {
            logEvent(
              logger,
              'error',
              failedEvent,
              { err: new Error(`Shutdown still pending after ${graceMs}ms`) },
              'Shutdown timed out',
            );
            exit(1);
          }, graceMs);

    close().then(
      () => {
        clearTimeout(timer);
        exit(0);
      },
      (err: unknown) => {
        clearTimeout(timer);
        logEvent(logger, 'error', failedEvent, { err }, 'Error during shutdown');
        exit(1);
      },
    );
  };
};
