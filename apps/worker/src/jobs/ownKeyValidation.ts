import { OWN_KEY_VALIDATION_QUEUE, ownKeyValidationJobSchema } from '@nebula-chat/contracts';
import { bindAttributes, componentLogger, logEvent, SpanKind, withSpan } from '@nebula-chat/otel';
import type { QueuedJob } from '@worker/jobs/directReply';
import { validateOwnKey } from '@worker/ownKeys/validateOwnKey';
import type { ValidateOwnKeyDeps } from '@worker/ownKeys/validateOwnKey';

// Throws when the provider cannot answer, so BullMQ retries; a payload breaking the contract is logged and dropped.
export const createOwnKeyValidationProcessor =
  (deps: ValidateOwnKeyDeps) =>
  async (job: QueuedJob): Promise<void> => {
    const payload = ownKeyValidationJobSchema.safeParse(job.data);
    if (!payload.success) {
      logEvent(
        componentLogger(deps.logger, 'chat'),
        'error',
        'job.payload.rejected',
        { 'nebula.job.id': job.id, 'error.type': 'Validation', err: payload.error },
        `${OWN_KEY_VALIDATION_QUEUE} job dropped: its payload breaks the contract`,
      );
      return;
    }
    const logger = bindAttributes(deps.logger, {
      'nebula.job.id': job.id,
      'nebula.own_key.id': payload.data.ownKeyId,
    });
    await withSpan(
      `${OWN_KEY_VALIDATION_QUEUE} process`,
      {
        kind: SpanKind.CONSUMER,
        attributes: {
          'messaging.system': 'bullmq',
          'messaging.destination.name': OWN_KEY_VALIDATION_QUEUE,
          'messaging.operation.type': 'process',
        },
      },
      () => validateOwnKey(payload.data.ownKeyId, { ...deps, logger }),
    );
  };
