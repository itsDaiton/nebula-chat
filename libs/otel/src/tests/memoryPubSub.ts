import type { LogLevelPubSub } from '../logLevelBroadcast';

/**
 * An in-process stand-in for Redis pub/sub: `publish` delivers synchronously to
 * every handler subscribed to the channel and resolves to how many there were.
 */
export const memoryPubSub = (): LogLevelPubSub & { channels: () => string[] } => {
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
    channels: () => [...handlers.keys()],
  };
};
