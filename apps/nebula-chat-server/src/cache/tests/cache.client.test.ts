import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Stands in for a node-redis client, including its connection event surface. */
class FakeRedisClient extends EventEmitter {
  connect = vi.fn(async () => undefined);
  quit = vi.fn(async () => undefined);
}

let fakeClient = new FakeRedisClient();
let createClientOptions: Record<string, unknown> = {};

vi.mock('redis', () => ({
  createClient: vi.fn((options: Record<string, unknown>) => {
    createClientOptions = options;
    return fakeClient;
  }),
}));

vi.mock('@backend/env', () => ({
  env: { REDIS_URL: 'redis://localhost:6379', REDIS_PASSWORD: undefined },
}));

vi.mock('@backend/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const loadClientModule = async () => {
  vi.resetModules();
  fakeClient = new FakeRedisClient();
  return import('@backend/cache/cache.client');
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createRedisClient', () => {
  it('connects and returns the client', async () => {
    const { createRedisClient } = await loadClientModule();

    const client = await createRedisClient();

    expect(client).toBe(fakeClient);
    expect(fakeClient.connect).toHaveBeenCalledTimes(1);
  });

  it('reuses the connected client instead of reconnecting', async () => {
    const { createRedisClient } = await loadClientModule();

    await createRedisClient();
    fakeClient.emit('ready');
    await createRedisClient();

    expect(fakeClient.connect).toHaveBeenCalledTimes(1);
  });

  it('configures the client from REDIS_URL', async () => {
    const { createRedisClient } = await loadClientModule();

    await createRedisClient();

    expect(createClientOptions['url']).toBe('redis://localhost:6379');
  });

  it('omits the password when none is configured', async () => {
    const { createRedisClient } = await loadClientModule();

    await createRedisClient();

    expect(createClientOptions).not.toHaveProperty('password');
  });

  it('wraps a connection failure in a RedisConnectionError', async () => {
    const { createRedisClient } = await loadClientModule();
    fakeClient.connect.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(createRedisClient()).rejects.toThrow('Failed to connect to Redis: ECONNREFUSED');
  });

  it('reports an unknown error when the rejection is not an Error', async () => {
    const { createRedisClient } = await loadClientModule();
    fakeClient.connect.mockRejectedValue('something odd');

    await expect(createRedisClient()).rejects.toThrow('Unknown error');
  });
});

describe('connection state', () => {
  it('starts disconnected', async () => {
    const { isRedisConnected } = await loadClientModule();

    expect(isRedisConnected()).toBe(false);
  });

  it("reports connected once the client emits 'ready'", async () => {
    const { createRedisClient, isRedisConnected } = await loadClientModule();
    await createRedisClient();

    fakeClient.emit('ready');

    expect(isRedisConnected()).toBe(true);
  });

  it("reports connected on 'connect'", async () => {
    const { createRedisClient, isRedisConnected } = await loadClientModule();
    await createRedisClient();

    fakeClient.emit('connect');

    expect(isRedisConnected()).toBe(true);
  });

  it.each(['error', 'reconnecting', 'end'])("reports disconnected after '%s'", async (event) => {
    const { createRedisClient, isRedisConnected } = await loadClientModule();
    await createRedisClient();
    fakeClient.emit('ready');

    fakeClient.emit(event, new Error('dropped'));

    expect(isRedisConnected()).toBe(false);
  });

  it('reconnects after the connection drops', async () => {
    const { createRedisClient, isRedisConnected } = await loadClientModule();
    await createRedisClient();
    fakeClient.emit('ready');
    fakeClient.emit('end');

    await createRedisClient();

    expect(isRedisConnected()).toBe(false);
    expect(fakeClient.connect).toHaveBeenCalledTimes(2);
  });
});

describe('reconnect strategy', () => {
  const strategy = () =>
    (createClientOptions['socket'] as { reconnectStrategy: (retries: number) => number | false })
      .reconnectStrategy;

  it('backs off further with each retry', async () => {
    const { createRedisClient } = await loadClientModule();
    await createRedisClient();

    expect(strategy()(1)).toBe(100);
    expect(strategy()(5)).toBe(500);
  });

  it('caps the delay at three seconds', async () => {
    const { createRedisClient } = await loadClientModule();
    await createRedisClient();

    expect(strategy()(9)).toBe(900);
    expect(strategy()(10)).toBe(1000);
  });

  it('gives up past the configured maximum attempts', async () => {
    const { createRedisClient } = await loadClientModule();
    await createRedisClient();

    expect(strategy()(11)).toBe(false);
  });
});

describe('closeRedisClient', () => {
  it('quits the client and marks it disconnected', async () => {
    const { createRedisClient, closeRedisClient, isRedisConnected } = await loadClientModule();
    await createRedisClient();
    fakeClient.emit('ready');

    await closeRedisClient();

    expect(fakeClient.quit).toHaveBeenCalled();
    expect(isRedisConnected()).toBe(false);
  });

  it('is a no-op when no client was ever created', async () => {
    const { closeRedisClient } = await loadClientModule();

    await expect(closeRedisClient()).resolves.toBeUndefined();
    expect(fakeClient.quit).not.toHaveBeenCalled();
  });

  it('swallows a failure to quit', async () => {
    const { createRedisClient, closeRedisClient } = await loadClientModule();
    await createRedisClient();
    fakeClient.quit.mockRejectedValue(new Error('already gone'));

    await expect(closeRedisClient()).resolves.toBeUndefined();
  });
});
