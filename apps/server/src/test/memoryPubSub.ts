import type { RedisPubSub } from '@nebula-chat/redis';

/**
 * An in-process `redis.pubsub`: `publish` delivers synchronously to every subscribed handler (one per listening instance) and resolves to their count.
 */
export const memoryPubSub = (): RedisPubSub => {
  const handlers = new Map<string, ((message: string) => void)[]>();
  return {
    publish: async (channel, message) => {
      const subscribers = handlers.get(channel) ?? [];
      for (const onMessage of subscribers) onMessage(message);
      return subscribers.length;
    },
    subscribe: async (channel, onMessage) => {
      handlers.set(channel, [...(handlers.get(channel) ?? []), onMessage]);
    },
    unsubscribe: async (channel, onMessage) => {
      const remaining = (handlers.get(channel) ?? []).filter((h) => h !== onMessage);
      if (remaining.length > 0) handlers.set(channel, remaining);
      else handlers.delete(channel);
    },
  };
};
