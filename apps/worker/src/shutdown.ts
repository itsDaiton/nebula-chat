import { logEvent } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';

type ShutdownOptions = {
  logger: Logger;
  /** Everything that must finish before the process may exit: the queue worker, Redis, the span flush. */
  close: () => Promise<void>;
  exit?: (code: number) => void;
};

// Exits once `close` settles, not when the event loop drains: an unclosed handle would hold the process.
// A second signal mid-shutdown is ignored.
export const createShutdown = ({
  logger,
  close,
  exit = (code) => process.exit(code),
}: ShutdownOptions): (() => void) => {
  let started = false;

  return () => {
    if (started) return;
    started = true;

    close().then(
      () => exit(0),
      (err: unknown) => {
        logEvent(logger, 'error', 'worker.shutdown.failed', { err }, 'Error during shutdown');
        exit(1);
      },
    );
  };
};
