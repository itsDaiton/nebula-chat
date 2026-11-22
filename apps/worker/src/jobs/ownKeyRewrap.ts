import { OWN_KEY_REWRAP_QUEUE, ownKeyRewrapJobSchema } from '@nebula-chat/contracts';
import { bindAttributes, componentLogger, logEvent, SpanKind, withSpan } from '@nebula-chat/otel';
import type { QueuedJob } from '@worker/jobs/directReply';
import { rewrapOwnKeys } from '@worker/ownKeys/rewrapOwnKeys';
import type { RewrapDeps } from '@worker/ownKeys/rewrapOwnKeys';

// Throws when a key could not be re-wrapped so BullMQ retries; the rest are already done.
export const createOwnKeyRewrapProcessor =
  (deps: RewrapDeps) =>
  async (job: QueuedJob): Promise<void> => {
    if (!ownKeyRewrapJobSchema.safeParse(job.data).success) {
      logEvent(
        componentLogger(deps.logger, 'chat'),
        'error',
        'job.payload.rejected',
        { 'nebula.job.id': job.id, 'error.type': 'Validation' },
        `${OWN_KEY_REWRAP_QUEUE} job dropped: its payload breaks the contract`,
      );
      return;
    }
    const logger = bindAttributes(deps.logger, { 'nebula.job.id': job.id });
    const failed = await withSpan(
      `${OWN_KEY_REWRAP_QUEUE} process`,
      {
        kind: SpanKind.CONSUMER,
        attributes: {
          'messaging.system': 'bullmq',
          'messaging.destination.name': OWN_KEY_REWRAP_QUEUE,
          'messaging.operation.type': 'process',
        },
      },
      () => rewrapOwnKeys({ ...deps, logger }),
    );
    if (failed > 0) throw new Error(`Re-wrap left ${failed} Own key(s) behind`);
  };
