import {
  CLARIFYING_QUESTION_TIMEOUT_QUEUE,
  clarifyingQuestionTimeoutJobSchema,
} from '@nebula-chat/contracts';
import { componentLogger, logEvent } from '@nebula-chat/otel';
import type { QueuedJob } from '@worker/jobs/directReply';
import { endClarifyingWait } from '@worker/runs/endClarifyingWait';
import type { EndWaitDeps } from '@worker/runs/endClarifyingWait';

export const createClarifyingQuestionTimeoutProcessor =
  (deps: EndWaitDeps) =>
  async (job: QueuedJob): Promise<void> => {
    const payload = clarifyingQuestionTimeoutJobSchema.safeParse(job.data);
    if (!payload.success) {
      logEvent(
        componentLogger(deps.logger, 'chat'),
        'error',
        'job.payload.rejected',
        { 'nebula.job.id': job.id, 'error.type': 'Validation', err: payload.error },
        `${CLARIFYING_QUESTION_TIMEOUT_QUEUE} job dropped: its payload breaks the contract`,
      );
      return;
    }
    await endClarifyingWait(payload.data.runId, deps);
  };
