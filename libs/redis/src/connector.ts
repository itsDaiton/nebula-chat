import type { LazyConnection } from './types';

/**
 * Returns a `connect` that opens the connection if it never connected and resolves once ready; with no offline queue, primitives that must not fail open await it.
 * Concurrent callers share one attempt.
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
