import { describe, expect, it, vi } from 'vitest';
import { createConnector } from '../connector';

/**
 * Like an ioredis client with `lazyConnect`: `'wait'` until the first `connect()`,
 * which goes `'connecting'` at once and then reaches `'ready'` — or, when Redis is
 * unreachable, rejects and leaves the client `'reconnecting'` in the background.
 */
const lazyConnection = ({ status = 'wait', reachable = true } = {}) => {
  const connection = {
    status,
    connect: vi.fn(async () => {
      connection.status = 'connecting';
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (!reachable) {
        connection.status = 'reconnecting';
        throw new Error('connect ECONNREFUSED');
      }
      connection.status = 'ready';
    }),
  };
  return connection;
};

describe('createConnector', () => {
  it('opens a connection that has never connected, resolving once it is ready', async () => {
    const connection = lazyConnection();

    await createConnector(connection)();

    expect(connection.status).toBe('ready');
    expect(connection.connect).toHaveBeenCalledTimes(1);
  });

  it('makes every concurrent caller wait for the one connect', async () => {
    const connection = lazyConnection();
    const connect = createConnector(connection);

    const statusOnResolve = await Promise.all(
      [connect(), connect(), connect()].map((pending) => pending.then(() => connection.status)),
    );

    expect(statusOnResolve).toEqual(['ready', 'ready', 'ready']);
    expect(connection.connect).toHaveBeenCalledTimes(1);
  });

  it('leaves a connection that is already connected alone', async () => {
    const connection = lazyConnection({ status: 'ready' });

    await createConnector(connection)();

    expect(connection.connect).not.toHaveBeenCalled();
  });

  it('rejects every waiting caller when the first connect fails', async () => {
    const connection = lazyConnection({ reachable: false });
    const connect = createConnector(connection);

    const results = await Promise.allSettled([connect(), connect()]);

    expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected']);
    expect(connection.connect).toHaveBeenCalledTimes(1);
  });

  it('does not hold callers up once the first connect has failed', async () => {
    const connection = lazyConnection({ reachable: false });
    const connect = createConnector(connection);
    await connect().catch(() => undefined);

    await expect(connect()).resolves.toBeUndefined();
    expect(connection.connect).toHaveBeenCalledTimes(1);
  });
});
