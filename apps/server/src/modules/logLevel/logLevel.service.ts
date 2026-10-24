import { collectLogLevelReports, publishLogLevelChange } from '@nebula-chat/otel';
import { SERVICE_NAME } from '@server/logger';
import type { ChangeLogLevelDTO } from '@server/modules/logLevel/logLevel.types';
import { redis } from '@server/redis';

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
  /**
   * Asks every running server instance for the levels it applies now. Each one
   * answers for itself, so an instance that missed a change shows as it is.
   */
  read() {
    return collectLogLevelReports({ pubsub: redis.pubsub, serviceName: SERVICE_NAME });
  },
};
