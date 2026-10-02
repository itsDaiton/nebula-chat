import { publishLogLevelChange } from '@nebula-chat/otel';
import { SERVICE_NAME } from '@backend/logger';
import type { ChangeLogLevelDTO } from '@backend/modules/logLevel/logLevel.types';
import { redis } from '@backend/redis';

export const logLevelService = {
  /**
   * Broadcasts the change to every running server instance — this one included,
   * through its own subscription. Each instance applies it and logs it itself.
   */
  async change(change: ChangeLogLevelDTO) {
    const expiresAt = new Date(Date.now() + change.ttlSeconds * 1000);
    const receivers = await publishLogLevelChange({
      pubsub: redis.pubsub,
      serviceName: SERVICE_NAME,
      change,
    });
    return { receivers, expiresAt };
  },
};
