import { describe, expect, it, vi } from 'vitest';
import { createPubSub } from '../pubsub';
import type { PublishConnection, SubscribeConnection } from '../types';

type Listener = (channel: string, message: string) => void;

type FakeSubscriber = SubscribeConnection & { deliver: Listener; channels: Set<string> };

const fakeSubscriber = (): FakeSubscriber => {
  const channels = new Set<string>();
  const listeners: Listener[] = [];
  const connection = {
    channels,
    subscribe: (async (...names: string[]) => {
      for (const name of names) channels.add(name);
      return channels.size;
    }) as SubscribeConnection['subscribe'],
    on: (_event: 'message', listener: Listener) => {
      listeners.push(listener);
      return connection;
    },
    deliver: (channel: string, message: string) => {
      for (const listener of listeners) listener(channel, message);
    },
  };
  return connection;
};

/**
 * A stand-in Redis server shared by any number of processes: `PUBLISH` reaches
 * every subscriber connection listening on the channel and returns their count,
 * as Redis does.
 */
const fakeRedis = () => {
  const subscribers: FakeSubscriber[] = [];

  // Like the lib's main connection: lazy, and with no offline queue, so a
  // command sent before the first connect is rejected rather than queued.
  const publisherConnection = (status: 'wait' | 'ready') => {
    const connection = {
      status: status as string,
      connect: vi.fn(async () => {
        connection.status = 'ready';
      }),
      publish: (async (channel: string, message: string) => {
        if (connection.status !== 'ready') {
          throw new Error("Stream isn't writeable and enableOfflineQueue options is false");
        }
        const listening = subscribers.filter((s) => s.channels.has(channel));
        for (const s of listening) s.deliver(channel, message);
        return listening.length;
      }) as PublishConnection['publish'],
    };
    return connection;
  };

  /** One process's pub/sub, opening its subscriber connection on this server. */
  const startProcess = ({ connected = true } = {}) => {
    const publisher = publisherConnection(connected ? 'ready' : 'wait');
    const subscriber = vi.fn(() => {
      const connection = fakeSubscriber();
      subscribers.push(connection);
      return connection;
    });
    return { pubsub: createPubSub({ publisher, subscriber }), publisher, subscriber };
  };
  return { startProcess };
};

describe('createPubSub', () => {
  it('delivers a message published on a channel to its subscriber', async () => {
    const { pubsub } = fakeRedis().startProcess();
    const received: string[] = [];
    await pubsub.subscribe('log-level:server', (message) => received.push(message));

    await pubsub.publish('log-level:server', 'hello');

    expect(received).toEqual(['hello']);
  });

  it('does not deliver messages published on another channel', async () => {
    const { pubsub } = fakeRedis().startProcess();
    const received: string[] = [];
    await pubsub.subscribe('log-level:server', (message) => received.push(message));

    await pubsub.publish('log-level:worker', 'not for us');

    expect(received).toEqual([]);
  });

  it('delivers to every handler on the channel', async () => {
    const { pubsub } = fakeRedis().startProcess();
    const received: string[] = [];
    await pubsub.subscribe('log-level:server', (message) => received.push(`a:${message}`));
    await pubsub.subscribe('log-level:server', (message) => received.push(`b:${message}`));

    await pubsub.publish('log-level:server', 'hello');

    expect(received).toEqual(['a:hello', 'b:hello']);
  });

  it('resolves a publish to how many processes received it', async () => {
    const redis = fakeRedis();
    const first = redis.startProcess();
    const second = redis.startProcess();
    await first.pubsub.subscribe('log-level:server', () => undefined);
    await second.pubsub.subscribe('log-level:server', () => undefined);

    expect(await first.pubsub.publish('log-level:server', 'hello')).toBe(2);
    expect(await first.pubsub.publish('log-level:worker', 'hello')).toBe(0);
  });

  it('connects a publisher that has never connected, rather than failing the publish', async () => {
    const redis = fakeRedis();
    const listener = redis.startProcess();
    const received: string[] = [];
    await listener.pubsub.subscribe('log-level:server', (message) => received.push(message));
    const { pubsub, publisher } = redis.startProcess({ connected: false });

    const receivers = await Promise.all([
      pubsub.publish('log-level:server', 'first'),
      pubsub.publish('log-level:server', 'second'),
    ]);

    expect(receivers).toEqual([1, 1]);
    expect(received).toEqual(['first', 'second']);
    expect(publisher.connect).toHaveBeenCalledTimes(1);
  });

  it('opens one subscriber connection, and only once something subscribes', async () => {
    const { pubsub, subscriber } = fakeRedis().startProcess();

    await pubsub.publish('log-level:server', 'hello');
    expect(subscriber).not.toHaveBeenCalled();

    await pubsub.subscribe('log-level:server', () => undefined);
    await pubsub.subscribe('log-level:worker', () => undefined);
    expect(subscriber).toHaveBeenCalledTimes(1);
  });
});
