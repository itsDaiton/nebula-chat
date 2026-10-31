import { Command } from '@langchain/langgraph';
import type { BaseCheckpointSaver } from '@langchain/langgraph';
import type { ReplyStreamEvent, RunJob } from '@nebula-chat/contracts';
import type { RunStatus } from '@nebula-chat/db';
import { NotFoundError, isAppError, toErrorEnvelope } from '@nebula-chat/errors';
import { componentLogger, logEvent } from '@nebula-chat/otel';
import type { LogAttributes } from '@nebula-chat/otel';
import { endStream, watchForCancel } from '@worker/directReplies/runDirectReply';
import type { ReplyStreamWriter, StoredMessage } from '@worker/directReplies/runDirectReply';
import type { ClarifyingAnswer, ClarifyingQuestion } from '@worker/runs/askUserTool';
import type { Brief } from '@worker/runs/brief';
import type { LoopEnding } from '@worker/runs/orchestrator';
import { createRunGraph } from '@worker/runs/runGraph';
import type { RunGraphDeps } from '@worker/runs/runGraph';
import { toReplyStreamEvents } from '@worker/runs/streamEvents';
import type { RunStreamChunk } from '@worker/runs/streamEvents';

/** The Messages loaded for the Session summary: the Session summary replaces raw history for a Run. */
const MAX_HISTORY_MESSAGES = 20;

type RunEndStatus = Extract<RunStatus, 'completed' | 'partial' | 'failed' | 'cancelled'>;

/** Where a Run reads its Session's Messages and records its progress: Postgres in production. */
export type RunStore = {
  /** The Run, only when `userId` owns it. */
  findRun: (runId: string, userId: string) => Promise<{ id: string } | null>;
  /** The Session's latest Messages, newest first. */
  findRecentMessages: (sessionId: string, limit: number) => Promise<StoredMessage[]>;
  markRunning: (runId: string, tokenBudget: number) => Promise<void>;
  /** Moves a `running` Run to `waiting`; false when something else (a cancel) already settled it. */
  markWaiting: (runId: string, tokensUsed: number) => Promise<boolean>;
  saveBrief: (runId: string, brief: Brief) => Promise<void>;
  finishRun: (runId: string, end: { status: RunEndStatus; tokensUsed: number }) => Promise<void>;
  createAssistantMessage: (message: {
    id: string;
    sessionId: string;
    runId: string;
    content: string;
    tokenCount: number;
  }) => Promise<void>;
};

export type RunDeps = Pick<
  RunGraphDeps,
  'steps' | 'ledger' | 'models' | 'prompts' | 'apiKeys' | 'logger' | 'limits' | 'toolbox'
> & {
  runs: RunStore;
  stream: ReplyStreamWriter;
  /** Postgres in production, in memory in tests; the Run's id is the thread. */
  checkpointer: BaseCheckpointSaver;
  runTimeoutMs: number;
  /** Schedules the delayed job that ends the Run's wait for an answer. */
  scheduleQuestionTimeout: (runId: string) => Promise<void>;
  /** How often a Run checks for a cancel request. Default 250 ms. */
  cancelPollMs?: number;
};

/** Executes one Run as its graph, streaming Step events and the answer, then ends the stream with the Run's status. */
export const executeRun = async (
  job: RunJob,
  deps: RunDeps,
  finalAttempt = true,
): Promise<void> => {
  const { runs, stream, logger, checkpointer } = deps;
  const startMs = Date.now();
  const thread = { configurable: { thread_id: job.runId } };
  let runFound = false;
  const tally = { tokens: 0 };
  // The answer streamed so far: what a stopped Run keeps.
  let answer = '';
  const abort = new AbortController();
  const timedOut = new Error(`The Run took longer than ${deps.runTimeoutMs} ms`);
  let stopWatching = (): void => undefined;
  let timer: NodeJS.Timeout | undefined;
  // Checked at the start of each Orchestrator turn, so a stop lands between turns even between polls.
  const checkCancelled = async (): Promise<void> => {
    if (!abort.signal.aborted && (await stream.isCancelled(job.streamId))) abort.abort();
    abort.signal.throwIfAborted();
  };

  // Events are appended in the order the graph produced them.
  let appended: Promise<void> = Promise.resolve();
  const enqueue = (event: ReplyStreamEvent): void => {
    appended = appended.then(() => stream.append(job.streamId, event));
  };

  const outcomeAttributes = (status: RunEndStatus): LogAttributes => ({
    'nebula.run.id': job.runId,
    'nebula.outcome': status,
    'nebula.duration_ms': Date.now() - startMs,
  });

  try {
    runFound = (await runs.findRun(job.runId, job.userId)) !== null;
    if (!runFound) throw new NotFoundError('Run', job.runId);

    const recent = await runs.findRecentMessages(job.sessionId, MAX_HISTORY_MESSAGES);
    const userMessage = recent.find((m) => m.id === job.messageId);
    if (!userMessage) throw new NotFoundError('Message', job.messageId);
    const history = recent
      .filter((m) => m.id !== job.messageId)
      .toReversed()
      .map(({ role, content }) => ({ role, content }));

    await runs.markRunning(job.runId, deps.limits.tokenBudget);
    const graph = createRunGraph({
      ...deps,
      runId: job.runId,
      userId: job.userId,
      sessionId: job.sessionId,
      tally,
      checkCancelled,
      saveBrief: (brief) => runs.saveBrief(job.runId, brief),
      saveQuestion: ({ id, content }) =>
        runs.createAssistantMessage({
          id,
          sessionId: job.sessionId,
          runId: job.runId,
          content,
          tokenCount: 0,
        }),
      message: userMessage.content,
      history,
    }).compile({ checkpointer });

    // A thread with state is never started again: pending work resumes with no input, a finished graph only ends the Run.
    const checkpoint = await graph.getState(thread);
    const hasCheckpoint = checkpoint.createdAt !== undefined;
    if (hasCheckpoint) tally.tokens = await deps.steps.completedTokens(job.runId);

    stopWatching = watchForCancel(job.streamId, deps, abort);
    timer = setTimeout(() => abort.abort(timedOut), deps.runTimeoutMs);
    if (!hasCheckpoint || checkpoint.next.length > 0) {
      // A resume job answers the pending question; a retry after the answer was taken just carries on.
      const asking = checkpoint.tasks.some((t) => t.interrupts.length > 0);
      let input: Command | null | Record<string, never> = hasCheckpoint ? null : {};
      if (asking && job.resume) {
        const reply = job.resume.answerMessageId
          ? recent.find((m) => m.id === job.resume?.answerMessageId)
          : undefined;
        if (job.resume.answerMessageId && !reply) {
          throw new NotFoundError('Message', job.resume.answerMessageId);
        }
        const resume: ClarifyingAnswer = reply
          ? { answered: true, text: reply.content }
          : { answered: false };
        input = new Command({ resume });
      }
      const chunks = await graph.stream(input as Parameters<typeof graph.stream>[0], {
        ...thread,
        streamMode: ['messages', 'custom'],
        subgraphs: true,
        signal: abort.signal,
      });
      for await (const chunk of chunks) {
        for (const event of toReplyStreamEvents(chunk as RunStreamChunk)) {
          if (event.type === 'token') answer += event.token;
          enqueue(event);
        }
      }
    }
    await appended;
    stopWatching();
    clearTimeout(timer);

    // The interrupt shows once per graph level in the stream; the root's pending task is the one place to read it.
    const question = (await graph.getState(thread)).tasks
      .flatMap((t) => t.interrupts)
      .map((i) => i.value as ClarifyingQuestion)[0];
    if (question) {
      await pauseForAnswer(job, question, tally.tokens, deps, outcomeAttributes);
      return;
    }

    const state = (await graph.getState(thread)).values as {
      answer: string;
      missing: string[];
      ending: LoopEnding | null;
      failedDelegates: string[];
    };
    const tokensUsed = tally.tokens;
    // A forced handoff still answers, from partial findings.
    const status: RunEndStatus =
      state.missing.length > 0 ||
      state.failedDelegates.length > 0 ||
      state.ending !== 'handoff' ||
      job.resume?.answerMessageId === null
        ? 'partial'
        : 'completed';

    await runs.createAssistantMessage({
      id: job.streamId,
      sessionId: job.sessionId,
      runId: job.runId,
      content: state.answer,
      tokenCount: tokensUsed,
    });
    await runs.finishRun(job.runId, { status, tokensUsed });
    // Checkpoints are resume state, not storage: the Steps are the record (ADR-0033 §4).
    await checkpointer.deleteThread(job.runId);
    await stream.append(job.streamId, { type: 'run-finished', runId: job.runId, status });
    await endStream(job.streamId, { type: 'end' }, stream);

    logEvent(
      componentLogger(logger, 'chat'),
      'info',
      'chat.run.completed',
      outcomeAttributes(status),
      `Run ${status} · ${tokensUsed} tokens · ${((Date.now() - startMs) / 1000).toFixed(1)} s`,
    );
  } catch (error) {
    stopWatching();
    clearTimeout(timer);
    if (abort.signal.aborted && abort.signal.reason !== timedOut) {
      await appended.catch(() => undefined);
      await endCancelled(job, answer, tally.tokens, deps, outcomeAttributes);
      return;
    }
    const envelope = toErrorEnvelope(error);
    const callerCaused = isAppError(error) && error.status < 500;
    // A failure before the final attempt leaves the Run and its checkpoints for the retry; a caller error or timeout would only repeat.
    if (!finalAttempt && !callerCaused && abort.signal.reason !== timedOut) {
      logEvent(
        componentLogger(logger, 'chat'),
        'warn',
        'chat.run.retrying',
        { ...outcomeAttributes('failed'), 'error.type': envelope.error, err: error },
        `Run failed · ${envelope.error}; the job will resume it from its checkpoint`,
      );
      await appended.catch(() => undefined);
      throw error;
    }
    logEvent(
      componentLogger(logger, 'chat'),
      callerCaused ? 'warn' : 'error',
      'chat.run.completed',
      { ...outcomeAttributes('failed'), 'error.type': envelope.error, err: error },
      `Run failed · ${envelope.error}`,
    );
    await appended.catch(() => undefined);
    try {
      await stream.append(job.streamId, { type: 'error', ...envelope });
      if (runFound) {
        await runs.finishRun(job.runId, { status: 'failed', tokensUsed: tally.tokens });
        await checkpointer.deleteThread(job.runId);
        await stream.append(job.streamId, {
          type: 'run-finished',
          runId: job.runId,
          status: 'failed',
          error: envelope,
        });
      }
      await endStream(job.streamId, { type: 'end' }, stream);
    } catch (err) {
      // The Run's own failure is already logged; this is the record or stream it could not be told on.
      logEvent(
        componentLogger(logger, 'chat'),
        'warn',
        'chat.stream.end.failed',
        { err },
        'Could not end the Run after it failed',
      );
    }
  }
};

// The job completes normally: a pause is not an error, and the Run holds no job while it waits.
const pauseForAnswer = async (
  job: RunJob,
  { questionMessageId, question }: ClarifyingQuestion,
  tokensUsed: number,
  { runs, stream, logger, scheduleQuestionTimeout }: RunDeps,
  outcomeAttributes: (status: RunEndStatus) => LogAttributes,
): Promise<void> => {
  // Scheduled either way: the job id is deterministic, and a job that finds the Run settled does nothing.
  await runs.markWaiting(job.runId, tokensUsed);
  await stream.append(job.streamId, {
    type: 'run-waiting',
    runId: job.runId,
    questionMessageId,
    question,
  });
  await endStream(job.streamId, { type: 'end' }, stream);
  await scheduleQuestionTimeout(job.runId);
  logEvent(
    componentLogger(logger, 'chat'),
    'info',
    'chat.run.waiting',
    {
      'nebula.run.id': job.runId,
      'nebula.duration_ms': outcomeAttributes('completed')['nebula.duration_ms'],
    },
    `Run waiting for an answer · ${tokensUsed} tokens`,
  );
};

/** Keeps the finished Steps and what the answer had streamed, then ends the Run and its stream `cancelled`. */
const endCancelled = async (
  job: RunJob,
  answer: string,
  tokensUsed: number,
  { runs, stream, logger, checkpointer }: RunDeps,
  outcomeAttributes: (status: RunEndStatus) => LogAttributes,
): Promise<void> => {
  try {
    if (answer.trim()) {
      await runs.createAssistantMessage({
        id: job.streamId,
        sessionId: job.sessionId,
        runId: job.runId,
        content: answer,
        tokenCount: tokensUsed,
      });
    }
    await runs.finishRun(job.runId, { status: 'cancelled', tokensUsed });
    await checkpointer.deleteThread(job.runId);
    await stream.append(job.streamId, {
      type: 'run-finished',
      runId: job.runId,
      status: 'cancelled',
    });
    await endStream(job.streamId, { type: 'end', reason: 'cancelled' }, stream);
    logEvent(
      componentLogger(logger, 'chat'),
      'info',
      'chat.run.completed',
      outcomeAttributes('cancelled'),
      `Run cancelled by its User · ${tokensUsed} tokens`,
    );
  } catch (err) {
    logEvent(
      componentLogger(logger, 'chat'),
      'error',
      'chat.run.completed',
      { ...outcomeAttributes('failed'), err },
      'Cancelled Run failed to finish',
    );
  }
};
