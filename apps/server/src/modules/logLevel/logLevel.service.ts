import {
  collectLogLevelReports,
  LOG_LEVEL_SERVICES,
  publishLogLevelChange,
} from '@nebula-chat/otel';
import type {
  ChangeLogLevelDTO,
  LogLevelServiceQuery,
} from '@server/modules/logLevel/logLevel.types';
import { redis } from '@server/redis';

export const logLevelService = {
  // Each instance of the service applies the change and logs it itself.
  async change({ service, ...change }: ChangeLogLevelDTO) {
    const expiresAt = new Date(Date.now() + change.ttlSeconds * 1000);
    const receivers = await publishLogLevelChange({
      pubsub: redis.pubsub,
      serviceName: LOG_LEVEL_SERVICES[service],
      change,
    });
    return { receivers, expiresAt };
  },
  // Each instance answers for itself, so one that missed a change shows as it is.
  read(service: LogLevelServiceQuery['service']) {
    return collectLogLevelReports({
      pubsub: redis.pubsub,
      serviceName: LOG_LEVEL_SERVICES[service],
    });
  },
};
