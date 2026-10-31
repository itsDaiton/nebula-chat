import { serializeReplyStreamEvent } from '@nebula-chat/contracts';
import type { ReplyStreamEvent } from '@nebula-chat/contracts';
import type { StreamEntry } from '@nebula-chat/redis';
import type { ReplyStreamReader } from '@server/redis';

// The reply-stream half of `@server/redis` in memory. A read with nothing new spends one of
// `timeouts` (an empty block) or else waits for the next append, as `XREAD … BLOCK` does.
const memoryReplyStreams = () => {
  const owners = new Map<string, string>();
  // Each Session's latest reply stream, the streams that have their terminal event, and the
  // streams a User asked to stop.
  const activeStreams = new Map<string, string>();
  const ended = new Set<string>();
  const cancelRequests = new Set<string>();
  const runCancelRequests = new Set<string>();
  const streams = new Map<string, StreamEntry[]>();
  const reads: { streamId: string; afterId: string }[] = [];
  const state = { timeouts: 0, readError: undefined as Error | undefined, closedReaders: 0 };
  const waiting = new Set<() => void>();

  const appendRaw = (streamId: string, payload: string): string => {
    const entries = streams.get(streamId) ?? [];
    const id = `1700000000000-${entries.length + 1}`;
    streams.set(streamId, [...entries, { id, payload }]);
    for (const wake of waiting) wake();
    return id;
  };

  const append = (streamId: string, ...events: ReplyStreamEvent[]): string[] =>
    events.map((event) => appendRaw(streamId, serializeReplyStreamEvent(event)));

  const after = (streamId: string, afterId: string): StreamEntry[] => {
    const entries = streams.get(streamId) ?? [];
    if (afterId === '0') return entries;
    return entries.slice(entries.findIndex((entry) => entry.id === afterId) + 1);
  };

  const openReplyStream = (streamId: string): ReplyStreamReader => {
    let closed = false;
    let stopWaiting: ((err: Error) => void) | undefined;
    return {
      read: async (afterId) => {
        reads.push({ streamId, afterId });
        if (closed) throw new Error('Connection is closed.');
        if (state.readError) throw state.readError;
        const entries = after(streamId, afterId);
        if (entries.length > 0) return entries;
        if (state.timeouts > 0) {
          state.timeouts -= 1;
          return [];
        }
        return new Promise<StreamEntry[]>((resolve, reject) => {
          const wake = () => {
            waiting.delete(wake);
            resolve(after(streamId, afterId));
          };
          waiting.add(wake);
          stopWaiting = (err) => {
            waiting.delete(wake);
            reject(err);
          };
        });
      },
      close: () => {
        if (closed) return;
        closed = true;
        state.closedReaders += 1;
        stopWaiting?.(new Error('Connection is closed.'));
      },
    };
  };

  /** What the worker does once a stream has its terminal event and its TTL then passes. */
  const expire = (streamId: string) => {
    ended.add(streamId);
    streams.delete(streamId);
  };

  const reset = () => {
    owners.clear();
    activeStreams.clear();
    ended.clear();
    cancelRequests.clear();
    runCancelRequests.clear();
    streams.clear();
    reads.length = 0;
    waiting.clear();
    Object.assign(state, { timeouts: 0, readError: undefined, closedReaders: 0 });
  };

  return {
    owners,
    activeStreams,
    ended,
    cancelRequests,
    runCancelRequests,
    expire,
    reads,
    state,
    append,
    appendRaw,
    reset,
    saveStreamOwner: async (streamId: string, userId: string) => {
      owners.set(streamId, userId);
    },
    findStreamOwner: async (streamId: string) => owners.get(streamId) ?? null,
    saveActiveStream: async (sessionId: string, streamId: string) => {
      activeStreams.set(sessionId, streamId);
    },
    findActiveStream: async (sessionId: string) => {
      const streamId = activeStreams.get(sessionId);
      return streamId === undefined || ended.has(streamId) ? null : streamId;
    },
    findLastStream: async (sessionId: string) => activeStreams.get(sessionId) ?? null,
    requestRunCancel: async (runId: string) => {
      runCancelRequests.add(runId);
    },
    isStreamEnded: async (streamId: string) => ended.has(streamId),
    isStreamExpired: async (streamId: string) => ended.has(streamId) && !streams.has(streamId),
    requestStreamCancel: async (streamId: string) => {
      cancelRequests.add(streamId);
    },
    openReplyStream,
  };
};

/** One instance per test file: the `@server/redis` mock factory and the test share it. */
export const replyStreams = memoryReplyStreams();

/** The reply-stream exports of `@server/redis`, for a `vi.mock` factory to spread. */
export const replyStreamsModule = {
  saveStreamOwner: replyStreams.saveStreamOwner,
  findStreamOwner: replyStreams.findStreamOwner,
  saveActiveStream: replyStreams.saveActiveStream,
  findActiveStream: replyStreams.findActiveStream,
  isStreamEnded: replyStreams.isStreamEnded,
  isStreamExpired: replyStreams.isStreamExpired,
  requestStreamCancel: replyStreams.requestStreamCancel,
  findLastStream: replyStreams.findLastStream,
  requestRunCancel: replyStreams.requestRunCancel,
  openReplyStream: replyStreams.openReplyStream,
};
