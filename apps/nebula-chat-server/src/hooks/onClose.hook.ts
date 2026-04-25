import { closeRedisClient } from '@backend/cache/cache.client';
import { prisma } from '@backend/prisma';

export const onCloseHook = async (): Promise<void> => {
  try {
    await closeRedisClient();
  } catch {
    // fail-open
  }
  try {
    await prisma.$disconnect();
  } catch {
    // fail-open
  }
};
