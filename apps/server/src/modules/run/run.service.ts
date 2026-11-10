import type { EventLogger } from '@nebula-chat/otel';
import { NotFoundError } from '@nebula-chat/errors';
import { auditService } from '@server/modules/audit/audit.service';
import { runRepository } from '@server/modules/run/run.repository';
import type { RunReader, RunWithSteps } from '@server/modules/run/run.types';
import { promoteClarifyingQuestionTimeout } from '@server/queue';
import { findLastStream, requestRunCancel } from '@server/redis';

type RunLogger = EventLogger<'warn'>;

// A waiting Run holds no job, so cancelling it is a flag plus making its timeout job fire now; the worker ends it.
const cancelWaitingRun = async (runId: string, logger: RunLogger): Promise<void> => {
  await requestRunCancel(runId);
  await promoteClarifyingQuestionTimeout(runId, logger);
};

const cancelWaitingRuns = async (
  filter: { sessionId?: string; userId: string },
  logger: RunLogger,
): Promise<void> => {
  const waiting = await runRepository.findWaiting(filter);
  await Promise.all(waiting.map((run) => cancelWaitingRun(run.id, logger)));
};

export const runService = {
  /** A Run for its owner, or for an acting Admin, whose read of someone else's Run is audited before it is served. */
  async getRun(runId: string, reader: RunReader): Promise<RunWithSteps> {
    const run = await runRepository.findWithSteps(runId);
    if (!run) {
      throw new NotFoundError('Run', runId);
    }
    if (run.userId === reader.userId) {
      return run;
    }
    // Not-found rather than forbidden, so a Run id tells a stranger nothing.
    if (!(await reader.isActingAdmin())) {
      throw new NotFoundError('Run', runId);
    }
    await auditService.append({
      actorType: 'admin',
      actorUserId: reader.userId,
      action: 'run.read',
      targetType: 'run',
      targetId: runId,
      detail: { userId: run.userId, sessionId: run.sessionId },
    });
    return run;
  },

  /** Cancels the Session's waiting Run, if any: archiving a Session must leave it unchanged. */
  async cancelWaitingRunsInSession(
    sessionId: string,
    userId: string,
    logger: RunLogger,
  ): Promise<void> {
    await cancelWaitingRuns({ sessionId, userId }, logger);
  },

  /** Cancels every waiting Run of a User who can no longer act; Ban calls it, Pending deletion will. */
  async cancelWaitingRunsOfUser(userId: string, logger: RunLogger): Promise<void> {
    await cancelWaitingRuns({ userId }, logger);
  },

  /** The stop button on a stream that ended on a question: cancels the Run waiting behind it. */
  async cancelWaitingRunOfStream(
    streamId: string,
    userId: string,
    logger: RunLogger,
  ): Promise<void> {
    const waiting = await runRepository.findWaiting({ userId });
    const behind = await Promise.all(
      waiting.map(async (run) => (await findLastStream(run.sessionId)) === streamId),
    );
    await Promise.all(
      waiting.filter((_, i) => behind[i]).map((run) => cancelWaitingRun(run.id, logger)),
    );
  },
};
