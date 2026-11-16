import { parseErrorEnvelope } from '@nebula-chat/errors';
import { readReplyStream } from '@/libs/api/generated/streams/streams';
import type { FollowStreamOptions, ReplyEnd, StreamCursor } from '@/modules/chat/types/types';
import { IDLE_REPLY } from '@/modules/chat/utils/replyState';
import { parseSseStream } from '@/modules/chat/streaming/parseSseStream';
import { resources } from '@/resources';

// Stream entry ids are `<ms>-<seq>`, ordered by both parts.
const isAfter = (id: string, lastId: string | undefined): boolean => {
  if (lastId === undefined) return true;
  const [ms = 0, seq = 0] = id.split('-').map(Number);
  const [lastMs = 0, lastSeq = 0] = lastId.split('-').map(Number);
  return ms > lastMs || (ms === lastMs && seq > lastSeq);
};

// Resolves after `ms`, or at once when `signal` aborts.
const wait = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (ms <= 0 || signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

// The stream mutator resolves with the raw Response, though the generated type says string.
// A network failure resolves to null, for the caller to reconnect.
const openReplyStream = async (
  streamId: string,
  lastEventId: string | undefined,
  signal: AbortSignal,
): Promise<Response | null> => {
  try {
    return (await readReplyStream(
      streamId,
      lastEventId === undefined ? undefined : { lastEventId },
      undefined,
      signal,
    )) as unknown as Response;
  } catch {
    return null;
  }
};

// A refusal (4xx) will not change on retry, nor anything once retries run out; a 5xx may be a
// restarting server.
const assertRetryable = async (response: Response, canRetry: boolean): Promise<void> => {
  if (response.status >= 500 && canRetry) return;
  const envelope = parseErrorEnvelope(await response.json().catch(() => null));
  throw new Error(envelope?.message ?? resources.chat.streamError);
};

// Reads one connection's body; null when it closed or dropped before the stream was over.
const readReply = async (
  body: ReadableStream<Uint8Array>,
  cursor: StreamCursor,
  onEvent: FollowStreamOptions['onEvent'],
): Promise<ReplyEnd | null> => {
  try {
    for await (const frame of parseSseStream(body)) {
      if (frame.id !== undefined) {
        // A reconnect resumes after `lastEventId`; anything at or before it is already shown.
        if (!isAfter(frame.id, cursor.lastEventId)) continue;
        cursor.lastEventId = frame.id;
        cursor.retries = 0;
      }
      const end = onEvent(frame);
      if (end) return end;
    }
  } catch {
    // The connection dropped mid-body: the caller reconnects.
  }
  return null;
};

// Reconnects after the last event it saw (ADR-0014); an expired stream falls back to the saved reply.
// Null once aborted; throws once retries run out.
export const followStream = async ({
  streamId,
  signal,
  reconnectDelaysMs,
  onEvent,
  onExpired,
  open = openReplyStream,
}: FollowStreamOptions): Promise<ReplyEnd | null> => {
  const cursor: StreamCursor = { lastEventId: undefined, retries: 0 };
  while (!signal.aborted) {
    const response = await open(streamId, cursor.lastEventId, signal);
    if (response?.status === 404) {
      await onExpired();
      return IDLE_REPLY;
    }
    if (response && (!response.ok || !response.body)) {
      await assertRetryable(response, cursor.retries < reconnectDelaysMs.length);
    } else if (response?.body) {
      const end = await readReply(response.body, cursor, onEvent);
      if (end) return end;
    }
    if (signal.aborted) break;

    // The body closed without `end`, or never opened: the connection dropped mid-reply.
    const delay = reconnectDelaysMs[cursor.retries];
    if (delay === undefined) throw new Error(resources.chat.streamError);
    cursor.retries += 1;
    await wait(delay, signal);
  }
  return null;
};
