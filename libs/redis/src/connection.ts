import IORedis from 'ioredis';
import type { Redis } from 'ioredis';

export type ConnectionManager = {
  /** The main command connection, used by the cache and general commands. */
  main: Redis;
  /** The subscriber connection for pub/sub, opened on first call. */
  subscriber(): Redis;
  /** Tears down every connection this manager owns. */
  close(): Promise<void>;
};

const closeConnection = async (connection: Redis): Promise<void> => {
  // `quit()` sends a QUIT command, which forces a connect first — on a
  // lazily-connected client that never connected (or against a down Redis)
  // that would hang retrying. Only quit gracefully when actually connected;
  // otherwise tear the socket down synchronously.
  if (connection.status === 'ready') {
    try {
      await connection.quit();
      return;
    } catch {
      // Fall through to a hard disconnect.
    }
  }
  connection.disconnect();
};

/**
 * Owns the app's Redis connection(s): a main command connection, plus a
 * subscriber connection for pub/sub (in subscriber mode Redis runs no other
 * command), opened only once something subscribes. BullMQ (a connection
 * configured with `maxRetriesPerRequest: null`) is provisioned here when M-7
 * lands — a caller asks a primitive for what it needs and the manager hands over
 * the right connection, so call sites never learn there is more than one.
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
  let subscriberConnection: Redis | undefined;

  // A SUBSCRIBE waits in the offline queue for as long as Redis is down, rather
  // than failing after 20 retries and never listening; ioredis re-subscribes on
  // its own after a reconnect.
  const subscriber = (): Redis => {
    subscriberConnection ??= main.duplicate({
      enableOfflineQueue: true,
      maxRetriesPerRequest: null,
    });
    return subscriberConnection;
  };

  const close = async (): Promise<void> => {
    await Promise.all([main, subscriberConnection].flatMap((c) => (c ? [closeConnection(c)] : [])));
  };

  return { main, subscriber, close };
};
