import { createRedis } from '@nebula-chat/redis';
import type { RedisToolkit } from '@nebula-chat/redis';
import { env } from '@worker/env';
import { logger } from '@worker/logger';

/** The worker's single Redis toolkit: reply streams, and the connections BullMQ runs on. */
export const redis: RedisToolkit = createRedis({ redisUrl: env.REDIS_URL, logger });
