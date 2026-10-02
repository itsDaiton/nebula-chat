import { componentLogger, logEvent } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';
import type { ConnectionEvents } from './types';

/**
 * Logs a connection's errors through `logger`; with no `error` listener, ioredis
 * writes each one to `console.error` instead. While Redis is down ioredis errors on
 * every reconnect attempt, so only the first error of an outage is an `error` and
 * the rest are `debug`; the `ready` that ends the outage logs how long it lasted.
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
