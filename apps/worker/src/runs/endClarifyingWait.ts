import type { BaseCheckpointSaver } from '@langchain/langgraph';
import type { RunJob } from '@nebula-chat/contracts';
import { componentLogger, logEvent } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';
import { stepIdFor } from '@worker/runs/steps';

export type WaitingRun = { userId: string; sessionId: string; messageId: string };

/** Where a waiting Run is settled out of `waiting`: Postgres in production. */
export type WaitingRunStore = {
  /** Moves a `waiting` Run to `next` in one conditional update; null when an answer or a cancel got there first. */
  settleWaiting: (runId: string, next: 'queued' | 'cancelled') => Promise<WaitingRun | null>;
};

export type EndWaitDeps = {
  runs: WaitingRunStore;
  checkpointer: BaseCheckpointSaver;
  /** Whether the Run's User asked to stop it while it waited. */
  isCancelled: (runId: string) => Promise<boolean>;
  enqueueRun: (job: RunJob) => Promise<void>;
  logger: Logger;
};

/** The reply stream of a resume nobody asked for: the answer is persisted under it, and nobody reads it. */
const timeoutStreamId = (runId: string): string => stepIdFor(runId, 'orchestrator', 'timeout');

// Settles exactly once against an answer: whoever moves the Run out of `waiting` first wins.
export const endClarifyingWait = async (
  runId: string,
  { runs, checkpointer, isCancelled, enqueueRun, logger }: EndWaitDeps,
): Promise<void> => {
  const cancelled = await isCancelled(runId);
  const run = await runs.settleWaiting(runId, cancelled ? 'cancelled' : 'queued');
  const log = componentLogger(logger, 'chat');
  if (!run) {
    logEvent(
      log,
      'debug',
      'chat.run.wait.settled',
      { 'nebula.run.id': runId },
      'Wait already settled',
    );
    return;
  }
  if (cancelled) {
    // Checkpoints are resume state, and this Run will not resume.
    await checkpointer.deleteThread(runId);
    logEvent(
      log,
      'info',
      'chat.run.completed',
      { 'nebula.run.id': runId, 'nebula.outcome': 'cancelled' },
      'Waiting Run cancelled by its User',
    );
    return;
  }
  await enqueueRun({
    ...run,
    runId,
    streamId: timeoutStreamId(runId),
    resume: { answerMessageId: null },
  });
  logEvent(
    log,
    'info',
    'chat.run.wait.timed_out',
    { 'nebula.run.id': runId },
    'No answer in time; the Run carries on without it',
  );
};
