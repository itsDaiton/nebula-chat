import { closeRedisClient } from '@backend/cache/cache.client';

export const onCloseHook = async (): Promise<void> => {
  try {
    await closeRedisClient();
  } catch {
    // fail-open
  }
};
