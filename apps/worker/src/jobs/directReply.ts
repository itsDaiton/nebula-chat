import { directReplyJobSchema } from '@nebula-chat/contracts';
import type { DirectReplyJob } from '@nebula-chat/contracts';
import { bindAttributes, componentLogger, logEvent } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';
import { runDirectReply } from '@worker/directReplies/runDirectReply';
import type { DirectReplyDeps } from '@worker/directReplies/runDirectReply';

/** The logger a job's lines go through, bound to every ID in its payload. */
const jobLogger = (logger: Logger, job: DirectReplyJob, jobId: string | undefined): Logger =>
  bindAttributes(logger, {
    'user.id': job.userId,
    'nebula.session.id': job.sessionId,
    'nebula.message.id': job.messageId,
    'nebula.reply.message.id': job.streamId,
    'nebula.job.id': jobId,
  });

/** What the processor reads off a BullMQ job; a `Job` satisfies it. */
export type QueuedJob = { id?: string | undefined; data: unknown };

// Never throws: a failed reply is told on its stream; a payload breaking the contract has no stream, so it is logged and dropped.
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
