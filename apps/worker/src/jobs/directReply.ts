import { directReplyJobSchema } from '@nebula-chat/contracts';
import { componentLogger, logEvent } from '@nebula-chat/otel';
import { jobLogger, runDirectReply } from '@worker/directReplies/runDirectReply';
import type { DirectReplyDeps } from '@worker/directReplies/runDirectReply';

/** What the processor reads off a BullMQ job; a `Job` satisfies it. */
export type QueuedJob = { id?: string | undefined; data: unknown };

/**
 * The BullMQ processor for the Direct reply queue: validates the payload against
 * the contract, binds the job's IDs onto its logger and runs the Direct reply.
 * It never throws: a failed reply is reported on its stream, and a payload that
 * breaks the contract has no stream to report on, so it is logged and dropped.
 */
export const createDirectReplyProcessor =
  (deps: DirectReplyDeps) =>
  async (job: QueuedJob): Promise<void> => {
    const payload = directReplyJobSchema.safeParse(job.data);
    if (!payload.success) {
      logEvent(
        componentLogger(deps.logger, 'chat'),
        'error',
        'job.payload.rejected',
        { 'nebula.job.id': job.id, 'error.type': 'Validation', err: payload.error },
        'Direct reply job dropped: its payload breaks the contract',
      );
      return;
    }
    await runDirectReply(payload.data, {
      ...deps,
      logger: jobLogger(deps.logger, payload.data, job.id),
    });
  };
