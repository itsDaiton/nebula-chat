import { RUN_QUEUE, runJobSchema } from '@nebula-chat/contracts';
import type { RunJob } from '@nebula-chat/contracts';
import {
  bindAttributes,
  componentLogger,
  extractTraceContext,
  logEvent,
  SpanKind,
  withSpan,
} from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';
import type { QueuedJob } from '@worker/jobs/directReply';
import { executeRun } from '@worker/runs/executeRun';
import type { RunDeps } from '@worker/runs/executeRun';

/** The logger a job's lines go through, bound to every ID in its payload. */
const jobLogger = (logger: Logger, job: RunJob, jobId: string | undefined): Logger =>
  bindAttributes(logger, {
    'user.id': job.userId,
    'nebula.session.id': job.sessionId,
    'nebula.message.id': job.messageId,
    'nebula.reply.message.id': job.streamId,
    'nebula.run.id': job.runId,
    'nebula.job.id': jobId,
  });

// Throws only to have BullMQ retry the job, leaving the Run to resume; its last try ends the Run on its stream. A payload breaking the contract has no stream, so it is logged and dropped.
export const createRunProcessor =
  (deps: RunDeps) =>
  async (job: QueuedJob): Promise<void> => {
    const payload = runJobSchema.safeParse(job.data);
    if (!payload.success) {
      logEvent(
        componentLogger(deps.logger, 'chat'),
        'error',
        'job.payload.rejected',
        { 'nebula.job.id': job.id, 'error.type': 'Validation', err: payload.error },
        'Run job dropped: its payload breaks the contract',
      );
      return;
    }
    // A consumer span continuing the server's trace; a job with no trace context starts its own.
    await withSpan(
      `${RUN_QUEUE} process`,
      {
        kind: SpanKind.CONSUMER,
        parent: extractTraceContext(payload.data),
        attributes: {
          'messaging.system': 'bullmq',
          'messaging.destination.name': RUN_QUEUE,
          'messaging.operation.type': 'process',
        },
      },
      () =>
        executeRun(
          payload.data,
          { ...deps, logger: jobLogger(deps.logger, payload.data, job.id) },
          (job.attemptsMade ?? 0) + 1 >= (job.opts?.attempts ?? 1),
        ),
    );
  };
