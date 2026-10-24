import { componentLogger, logEvent } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';
import type { ConnectionEvents } from './types';

/**
 * Logs a connection's errors through `logger` (ioredis otherwise uses `console.error`); only an outage's first error is `error`, the rest `debug`,
 * and the `ready` ending it logs how long it lasted.
 */
export const logConnectionErrors = (connection: ConnectionEvents, logger: Logger): void => {
  const log = componentLogger(logger, 'redis');
  let failingSince: number | undefined;

  connection.on('error', (err) => {
    if (failingSince === undefined) {
      failingSince = Date.now();
      logEvent(
        log,
        'error',
        'redis.connection.failed',
        { err },
        'Redis connection failed; retrying in the background',
      );
      return;
    }
    logEvent(log, 'debug', 'redis.connection.failed', { err }, 'Redis reconnect attempt failed');
  });

  connection.on('ready', () => {
    if (failingSince === undefined) return;
    logEvent(
      log,
      'info',
      'redis.connection.restored',
      { 'nebula.duration_ms': Date.now() - failingSince },
      'Redis connection restored',
    );
    failingSince = undefined;
  });
};
