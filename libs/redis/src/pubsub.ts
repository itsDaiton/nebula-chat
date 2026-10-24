import type { PublishConnection, SubscribeConnection } from './types';

/**
 * Redis pub/sub: fire-and-forget broadcast to whoever is subscribed now, so use it for resendable control signals, not data.
 */
export type RedisPubSub = {
  /** Sends `message` on `channel`; resolves to how many subscribers received it. */
  publish: (channel: string, message: string) => Promise<number>;
  /**
   * Calls `onMessage` with every message later published on `channel`. It runs
   * inside the connection's event handler, so it must not throw.
   */
  subscribe: (channel: string, onMessage: (message: string) => void) => Promise<void>;
  /** Stops calling `onMessage`; the channel is unsubscribed once its last handler is gone. */
  unsubscribe: (channel: string, onMessage: (message: string) => void) => Promise<void>;
};

type PubSubDeps = {
  publisher: PublishConnection;
  /** Opens `publisher` if it has never connected (the manager's shared `connect`). */
  connect: () => Promise<void>;
  /** Opens the subscriber connection; called once, on the first `subscribe`. */
  subscriber: () => SubscribeConnection;
};

/**
 * A subscriber-mode connection runs no other command, so subscriptions share one lazily opened connection; publishing uses the main one.
 */
export const createPubSub = ({ publisher, connect, subscriber }: PubSubDeps): RedisPubSub => {
  const handlers = new Map<string, Set<(message: string) => void>>();
  let connection: SubscribeConnection | undefined;

  const subscriberConnection = (): SubscribeConnection => {
    if (!connection) {
      connection = subscriber();
      connection.on('message', (channel, message) => {
        for (const onMessage of handlers.get(channel) ?? []) onMessage(message);
      });
    }
    return connection;
  };

  return {
    publish: async (channel, message) => {
      // The main connection rejects a command sent before its first connect is ready.
      await connect();
      return publisher.publish(channel, message);
    },
    subscribe: async (channel, onMessage) => {
      const channelHandlers = handlers.get(channel) ?? new Set();
      channelHandlers.add(onMessage);
      handlers.set(channel, channelHandlers);
      await subscriberConnection().subscribe(channel);
    },
    unsubscribe: async (channel, onMessage) => {
      const channelHandlers = handlers.get(channel);
      if (!channelHandlers?.delete(onMessage) || channelHandlers.size > 0) return;
      handlers.delete(channel);
      await subscriberConnection().unsubscribe(channel);
    },
  };
};
