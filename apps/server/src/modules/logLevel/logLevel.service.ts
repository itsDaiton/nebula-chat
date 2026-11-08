import {
  collectLogLevelReports,
  LOG_LEVEL_SERVICES,
  publishLogLevelChange,
} from '@nebula-chat/otel';
import type { ChangeLogLevelDTO } from '@server/modules/logLevel/logLevel.types';
import { redis } from '@server/redis';

type Service = keyof typeof LOG_LEVEL_SERVICES;

export const logLevelService = {
  /**
   * Broadcasts the change to every running instance of the service, this one
   * included for the server. Each instance applies it and logs it itself.
   */
  async change({ service, ...change }: ChangeLogLevelDTO) {
    const expiresAt = new Date(Date.now() + change.ttlSeconds * 1000);
    const receivers = await publishLogLevelChange({
      pubsub: redis.pubsub,
      serviceName: LOG_LEVEL_SERVICES[service],
      change,
    });
    return { receivers, expiresAt };
  },
  /**
   * Asks every running instance of the service for the levels it applies now. Each one
   * answers for itself, so an instance that missed a change shows as it is.
   */
  read(service: Service) {
    return collectLogLevelReports({
      pubsub: redis.pubsub,
      serviceName: LOG_LEVEL_SERVICES[service],
    });
  },
};
