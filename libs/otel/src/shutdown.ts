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
};

/**
 * Builds the SIGTERM/SIGINT handler: exits as soon as `close` settles rather than waiting for the event loop (`tsx watch` waits on that exit).
 * A second signal mid-shutdown is ignored.
 */
export const createShutdown = ({
  logger,
  close,
  failedEvent,
  exit = (code) => process.exit(code),
}: ShutdownOptions): (() => void) => {
  let started = false;

  return () => {
    if (started) return;
    started = true;

    close().then(
      () => exit(0),
      (err: unknown) => {
        logEvent(logger, 'error', failedEvent, { err }, 'Error during shutdown');
        exit(1);
      },
    );
  };
};
