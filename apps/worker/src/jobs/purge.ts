import { PURGE_QUEUE, purgeJobSchema } from '@nebula-chat/contracts';
import { bindAttributes, componentLogger, logEvent, SpanKind, withSpan } from '@nebula-chat/otel';
import type { QueuedJob } from '@worker/jobs/directReply';
import { runPurge } from '@worker/purge/runPurge';
import type { PurgeDeps } from '@worker/purge/runPurge';

// Throws when a User could not be Purged so BullMQ retries; the rest are already erased.
export const createPurgeProcessor =
  (deps: PurgeDeps) =>
  async (job: QueuedJob): Promise<void> => {
    if (!purgeJobSchema.safeParse(job.data).success) {
      logEvent(
        componentLogger(deps.logger, 'chat'),
        'error',
        'job.payload.rejected',
        { 'nebula.job.id': job.id, 'error.type': 'Validation' },
        'Purge job dropped: its payload breaks the contract',
      );
      return;
    }
    const logger = bindAttributes(deps.logger, { 'nebula.job.id': job.id });
    const counts = await withSpan(
      `${PURGE_QUEUE} process`,
      {
        kind: SpanKind.CONSUMER,
        attributes: {
          'messaging.system': 'bullmq',
          'messaging.destination.name': PURGE_QUEUE,
          'messaging.operation.type': 'process',
        },
      },
      () => runPurge({ ...deps, logger }),
    );
    if (counts.failed > 0) throw new Error(`Purge left ${counts.failed} User(s) behind`);
  };
