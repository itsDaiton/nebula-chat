import type { LazyConnection } from './types';

/**
 * Returns a `connect` that opens `connection` if it has never connected and
 * resolves once it is ready, or rejects when that attempt fails. With no offline
 * queue, every command sent before then is rejected, so a primitive that must not
 * fail open awaits this first. Concurrent callers share one attempt; once the
 * first one has settled it resolves at once (ioredis owns reconnecting).
 */
export const createConnector = (connection: LazyConnection): (() => Promise<void>) => {
  let connecting: Promise<void> | undefined;

  return async () => {
    if (connection.status === 'wait') {
      connecting ??= connection.connect().finally(() => {
        connecting = undefined;
      });
    }
    await connecting;
  };
};
