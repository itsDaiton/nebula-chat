import { logEvent } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';

type ShutdownOptions = {
  logger: Logger;
  /** Everything that must finish before the process may exit: the app, the telemetry flush. */
  close: () => Promise<void>;
  /** How long `close` gets before the process exits anyway. */
  timeoutMs: number;
  exit?: (code: number) => void;
};

/**
 * Builds the SIGTERM/SIGINT handler. It exits as soon as `close` settles rather
 * than waiting for the event loop to drain — a handle nobody closed (a socket, a
 * timer, an exporter retrying a collector that is down) would otherwise keep the
 * process alive until the supervisor kills it. `tsx watch` waits on that exit
 * before starting the new process, so a slow shutdown is a slow reload.
 *
 * A second signal mid-shutdown is ignored: the first one already owns the exit.
 */
export const createShutdown = ({
  logger,
  close,
  timeoutMs,
  exit = (code) => process.exit(code),
}: ShutdownOptions): (() => void) => {
  let started = false;

  return () => {
    if (started) return;
    started = true;

    setTimeout(() => {
      logEvent(
        logger,
        'error',
        'server.shutdown.timed_out',
        {},
        `Shutdown did not finish within ${timeoutMs}ms; exiting anyway`,
      );
      exit(1);
    }, timeoutMs).unref();

    close().then(
      () => exit(0),
      (err: unknown) => {
        logEvent(logger, 'error', 'server.shutdown.failed', { err }, 'Error during shutdown');
        exit(1);
      },
    );
  };
};
