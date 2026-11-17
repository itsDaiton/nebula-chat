import { parseErrorEnvelope } from '@nebula-chat/errors';
import type {
  ChatMessage,
  ReplyEnd,
  SseFrame,
  StreamEventResult,
} from '@/modules/chat/types/types';
import { IDLE_REPLY } from '@/modules/chat/utils/replyState';
import { applyRunEvent, parseRunEvent } from '@/modules/chat/streaming/runProgress';
import { failReply, withReply } from '@/modules/chat/streaming/replyHistory';
import { resources } from '@/resources';

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const endReply = (history: ChatMessage[], parsed: unknown): StreamEventResult => {
  const last = history.at(-1);
  if (last?.run?.status === 'failed')
    return { history, end: { status: 'failed', error: last.content } };
  // `end`, also when the User stopped the reply: what streamed is the saved reply.
  if ((parsed as { reason?: unknown } | null)?.reason !== 'cancelled')
    return { history, end: IDLE_REPLY };
  // A reply stopped before its first token persists nothing, so its empty bubble goes too; a Run's Steps stay.
  const isEmpty = last?.role === 'assistant' && last.content === '' && !last.run?.steps.length;
  const stopped: ReplyEnd = { status: 'stopped' };
  return { history: isEmpty ? history.slice(0, -1) : history, end: stopped };
};

/** The chat after one reply stream event, folded into its trailing assistant Message. */
export const applyStreamEvent = (
  history: ChatMessage[],
  { event, data }: SseFrame,
): StreamEventResult => {
  const parsed = parseJson(data);
  if (event === 'token') {
    const token = (parsed as { token?: unknown } | null)?.token;
    if (typeof token !== 'string') return { history };
    return { history: withReply(history, (last) => ({ ...last, content: last.content + token })) };
  }
  if (event === 'usage') {
    const { promptTokens, completionTokens, totalTokens } = parsed as Record<string, number>;
    // The saved Message carries this count, so the meta row shows it now rather than after a reload.
    return {
      history: withReply(history, (last) => ({ ...last, tokenCount: totalTokens })),
      usage: { promptTokens, completionTokens, totalTokens },
    };
  }
  if (event === 'step-started' || event === 'step-finished' || event === 'run-finished') {
    const runEvent = parseRunEvent(event, parsed);
    if (!runEvent) return { history };
    const next = withReply(history, (last) => applyRunEvent(last, runEvent));
    const runId = next.at(-1)?.runId;
    return { history: next, ...(runId && { staleRunId: runId }) };
  }
  if (event === 'run-waiting') {
    const { runId, questionMessageId, question } = (parsed ?? {}) as Record<string, unknown>;
    if (typeof question !== 'string' || typeof questionMessageId !== 'string') return { history };
    // The question is saved as its own Message, so the reply takes its id and text.
    return {
      history: withReply(history, (last) => ({
        ...last,
        id: questionMessageId,
        content: question,
        ...(typeof runId === 'string' && { runId }),
      })),
    };
  }
  if (event === 'error') {
    const error = parseErrorEnvelope(parsed)?.message ?? resources.chat.streamError;
    const next = failReply(history, error);
    // A failed Run still reports its `run-finished`, which the Inspector's Run waits on, so it reads on to `end`.
    return next.at(-1)?.run
      ? { history: next }
      : { history: next, end: { status: 'failed', error } };
  }
  return endReply(history, parsed);
};
