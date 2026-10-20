import { serializeReplyStreamEvent } from '@nebula-chat/contracts';
import type { ReplyStreamEvent } from '@nebula-chat/contracts';
import type { StreamEntry } from '@nebula-chat/redis';
import type { ReplyStreamReader } from '@backend/redis';

// The reply-stream half of `@backend/redis` in memory. A read with nothing new spends one of
// `timeouts` (an empty block) or else waits for the next append, as `XREAD … BLOCK` does.
const memoryReplyStreams = () => {
  const owners = new Map<string, string>();
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

  const reset = () => {
    owners.clear();
    streams.clear();
    reads.length = 0;
    waiting.clear();
    Object.assign(state, { timeouts: 0, readError: undefined, closedReaders: 0 });
  };

  return {
    owners,
    reads,
    state,
    append,
    appendRaw,
    reset,
    saveStreamOwner: async (streamId: string, userId: string) => {
      owners.set(streamId, userId);
    },
    findStreamOwner: async (streamId: string) => owners.get(streamId) ?? null,
    openReplyStream,
  };
};

/** One instance per test file: the `@backend/redis` mock factory and the test share it. */
export const replyStreams = memoryReplyStreams();
