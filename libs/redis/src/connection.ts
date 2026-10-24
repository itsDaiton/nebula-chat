import IORedis from 'ioredis';
import type { Redis } from 'ioredis';
import type { Logger } from '@nebula-chat/otel';
import { logConnectionErrors } from './connectionErrors';
import { createConnector } from './connector';

export type ConnectionManager = {
  /** The main command connection, used by the cache and general commands. */
  main: Redis;
  /** Opens `main` if it has never connected; every caller shares one attempt. */
  connect(): Promise<void>;
  /** The subscriber connection for pub/sub, opened on first call. */
  subscriber(): Redis;
  /**
   * A new connection for one blocking consumer (a stream reader, BullMQ): its
   * commands wait out an outage instead of failing. Closed with the manager.
   */
  dedicated(): Redis;
  /** Tears down every connection this manager owns. */
  close(): Promise<void>;
};

const closeConnection = async (connection: Redis): Promise<void> => {
  // `quit()` forces a connect first and would hang on a never-connected or down client, so quit gracefully only when connected; otherwise tear the socket down.
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
 * Owns the app's Redis connections: main, a lazily opened subscriber (subscriber mode runs no other command) and one dedicated per blocking consumer.
 * `lazyConnect` + no offline queue keep the cache fail-open fast, so `connect` must open it ahead of use; errors log through `logger`.
 */
export const createConnectionManager = (redisUrl: string, logger: Logger): ConnectionManager => {
  const main = new IORedis(redisUrl, {
    lazyConnect: true,
    enableOfflineQueue: false,
  });
  logConnectionErrors(main, logger);
  const connect = createConnector(main);
  let subscriberConnection: Redis | undefined;
  const dedicatedConnections = new Set<Redis>();

  // A SUBSCRIBE waits in the offline queue while Redis is down rather than failing after 20 retries; ioredis re-subscribes after a reconnect.
  const subscriber = (): Redis => {
    if (!subscriberConnection) {
      subscriberConnection = main.duplicate({
        enableOfflineQueue: true,
        maxRetriesPerRequest: null,
      });
      // `duplicate()` copies options, not listeners.
      logConnectionErrors(subscriberConnection, logger);
    }
    return subscriberConnection;
  };

  const dedicated = (): Redis => {
    const connection = main.duplicate({ enableOfflineQueue: true, maxRetriesPerRequest: null });
    logConnectionErrors(connection, logger);
    dedicatedConnections.add(connection);
    // A connection its owner already closed has nothing left for `close` to do.
    connection.once('end', () => dedicatedConnections.delete(connection));
    return connection;
  };

  const close = async (): Promise<void> => {
    await Promise.all(
      [main, subscriberConnection, ...dedicatedConnections].flatMap((c) =>
        c ? [closeConnection(c)] : [],
      ),
    );
  };

  return { main, connect, subscriber, dedicated, close };
};
