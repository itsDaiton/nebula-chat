import type { EventLogger } from '@nebula-chat/otel';
import { runRepository } from '@server/modules/run/run.repository';
import { promoteClarifyingQuestionTimeout } from '@server/queue';
import { findLastStream, requestRunCancel } from '@server/redis';

type RunLogger = EventLogger<'warn'>;

// A waiting Run holds no job, so cancelling it is a flag plus making its timeout job fire now; the worker ends it.
const cancelWaitingRun = async (runId: string, logger: RunLogger): Promise<void> => {
  await requestRunCancel(runId);
  await promoteClarifyingQuestionTimeout(runId, logger);
};

export const runService = {
  /** Cancels the Session's waiting Run, if any: archiving a Session must leave it unchanged. */
  async cancelWaitingRunsInSession(
    sessionId: string,
    userId: string,
    logger: RunLogger,
  ): Promise<void> {
    for (const run of await runRepository.findWaiting({ sessionId, userId })) {
      await cancelWaitingRun(run.id, logger);
    }
  },

  /** Cancels every waiting Run of a User who can no longer act (Ban, Pending deletion). */
  async cancelWaitingRunsOfUser(userId: string, logger: RunLogger): Promise<void> {
    for (const run of await runRepository.findWaiting({ userId })) {
      await cancelWaitingRun(run.id, logger);
    }
  },

  /** The stop button on a stream that ended on a question: cancels the Run waiting behind it. */
  async cancelWaitingRunOfStream(
    streamId: string,
    userId: string,
    logger: RunLogger,
  ): Promise<void> {
    for (const run of await runRepository.findWaiting({ userId })) {
      if ((await findLastStream(run.sessionId)) === streamId) {
        await cancelWaitingRun(run.id, logger);
      }
    }
  },
};
