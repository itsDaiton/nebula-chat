import type { RedisPubSub } from '@nebula-chat/redis';

/**
 * An in-process stand-in for `redis.pubsub`: `publish` delivers synchronously to
 * every handler subscribed to the channel and resolves to how many there were,
 * as Redis does. Each handler stands for one listening server instance.
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
  };
};
