import IORedis from 'ioredis';
import type { Redis } from 'ioredis';

export type ConnectionManager = {
  /** The main command connection, used by the cache and general commands. */
  main: Redis;
  /** Tears down every connection this manager owns. */
  close(): Promise<void>;
};

/**
 * Owns the app's Redis connection(s). Today it provisions a single main command
 * connection. Pub/sub (a dedicated subscriber connection, which in Redis cannot
 * also run normal commands) and BullMQ (a connection configured with
 * `maxRetriesPerRequest: null`) are provisioned here when M-8 / M-7 land — a
 * caller asks a primitive for what it needs and the manager hands over the right
 * connection, so call sites never learn there is more than one.
 *
 * `lazyConnect` + `enableOfflineQueue: false` keep the cache fail-open fast: when
 * Redis is unreachable a command rejects immediately rather than queueing, and
 * the cache turns that rejection into a miss.
 */
export const createConnectionManager = (redisUrl: string): ConnectionManager => {
  const main = new IORedis(redisUrl, {
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  const close = async (): Promise<void> => {
    // `quit()` sends a QUIT command, which forces a connect first — on a
    // lazily-connected client that never connected (or against a down Redis)
    // that would hang retrying. Only quit gracefully when actually connected;
    // otherwise tear the socket down synchronously.
    if (main.status === 'ready') {
      try {
        await main.quit();
        return;
      } catch {
        // Fall through to a hard disconnect.
      }
    }
    main.disconnect();
  };

  return { main, close };
};
