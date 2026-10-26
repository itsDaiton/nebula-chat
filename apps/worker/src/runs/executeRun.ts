import type { BaseCheckpointSaver } from '@langchain/langgraph';
import type { ReplyStreamEvent, RunJob } from '@nebula-chat/contracts';
import type { RunStatus } from '@nebula-chat/db';
import { NotFoundError, isAppError, toErrorEnvelope } from '@nebula-chat/errors';
import { componentLogger, logEvent } from '@nebula-chat/otel';
import type { LogAttributes } from '@nebula-chat/otel';
import { endStream } from '@worker/directReplies/runDirectReply';
import type { ReplyStreamWriter, StoredMessage } from '@worker/directReplies/runDirectReply';
import type { Brief } from '@worker/runs/brief';
import { createRunGraph } from '@worker/runs/runGraph';
import type { RunGraphDeps } from '@worker/runs/runGraph';
import { toReplyStreamEvents } from '@worker/runs/streamEvents';
import type { RunStreamChunk } from '@worker/runs/streamEvents';

/** The Messages loaded for the Session summary: the Session summary replaces raw history for a Run. */
const MAX_HISTORY_MESSAGES = 20;

type RunEndStatus = Extract<RunStatus, 'completed' | 'partial' | 'failed'>;

/** Where a Run reads its Session's Messages and records its progress: Postgres in production. */
export type RunStore = {
  /** The Run, only when `userId` owns it. */
  findRun: (runId: string, userId: string) => Promise<{ id: string } | null>;
  /** The Session's latest Messages, newest first. */
  findRecentMessages: (sessionId: string, limit: number) => Promise<StoredMessage[]>;
  markRunning: (runId: string) => Promise<void>;
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
  'steps' | 'ledger' | 'models' | 'prompts' | 'apiKeys' | 'logger'
> & {
  runs: RunStore;
  stream: ReplyStreamWriter;
  /** Postgres in production, in memory in tests; the Run's id is the thread. */
  checkpointer: BaseCheckpointSaver;
};

/**
 * Executes one Run as its LangGraph graph, persisting each Step and streaming its events, then the
 * answer's tokens; persists the answer under the stream's id and ends the stream with the Run's status.
 */
export const executeRun = async (job: RunJob, deps: RunDeps): Promise<void> => {
  const { runs, stream, logger, checkpointer } = deps;
  const startMs = Date.now();
  const thread = { configurable: { thread_id: job.runId } };
  let runFound = false;
  // What the Steps that finished used, read from the graph's state; nothing before the graph runs.
  let tokensSoFar = async (): Promise<number> => 0;

  // Events are appended in the order the graph produced them.
  let appended: Promise<void> = Promise.resolve();
  const enqueue = (event: ReplyStreamEvent): void => {
    appended = appended.then(() => stream.append(job.streamId, event));
  };

  const summary = (status: RunEndStatus): LogAttributes => ({
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

    await runs.markRunning(job.runId);
    const graph = createRunGraph({
      ...deps,
      runId: job.runId,
      userId: job.userId,
      sessionId: job.sessionId,
      saveBrief: (brief) => runs.saveBrief(job.runId, brief),
      message: userMessage.content,
      history,
    }).compile({ checkpointer });
    const readState = async () =>
      (await graph.getState(thread)).values as {
        answer: string;
        missing: string[];
        tokensUsed: number;
      };
    tokensSoFar = async () => (await readState()).tokensUsed;

    const chunks = await graph.stream(
      {},
      { ...thread, streamMode: ['messages', 'custom'], subgraphs: true },
    );
    for await (const chunk of chunks) {
      for (const event of toReplyStreamEvents(chunk as RunStreamChunk)) enqueue(event);
    }
    await appended;

    const state = await readState();
    const { tokensUsed } = state;
    const status: RunEndStatus = state.missing.length > 0 ? 'partial' : 'completed';

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
      summary(status),
      `Run ${status} · ${tokensUsed} tokens · ${((Date.now() - startMs) / 1000).toFixed(1)} s`,
    );
  } catch (error) {
    const envelope = toErrorEnvelope(error);
    const callerCaused = isAppError(error) && error.status < 500;
    logEvent(
      componentLogger(logger, 'chat'),
      callerCaused ? 'warn' : 'error',
      'chat.run.completed',
      { ...summary('failed'), 'error.type': envelope.error, err: error },
      `Run failed · ${envelope.error}`,
    );
    await appended.catch(() => undefined);
    try {
      if (runFound) {
        await runs.finishRun(job.runId, { status: 'failed', tokensUsed: await tokensSoFar() });
        await checkpointer.deleteThread(job.runId);
      }
      await stream.append(job.streamId, { type: 'error', ...envelope });
      if (runFound) {
        await stream.append(job.streamId, {
          type: 'run-finished',
          runId: job.runId,
          status: 'failed',
        });
      }
      await endStream(job.streamId, { type: 'end' }, stream);
    } catch (err) {
      // The Run's own failure is already logged; this is the record or stream it could not be told on.
      logEvent(
        componentLogger(logger, 'redis'),
        'warn',
        'chat.stream.end.failed',
        { err },
        'Could not end the Run after it failed',
      );
    }
  }
};
