import { parseReplyStreamEvent } from '@nebula-chat/contracts';
import { INTERNAL_ERROR_ENVELOPE, NotFoundError } from '@nebula-chat/errors';
import { componentLogger, logEvent } from '@nebula-chat/otel';
import { findStreamOwner, openReplyStream } from '@server/redis';
import type { StreamLogger } from '@server/modules/stream/stream.types';
import { SSE_KEEP_ALIVE, sseEvent } from '@server/utils/sse';

/** How long one read waits for a new entry before the relay sends a keep-alive. */
const RELAY_BLOCK_MS = 15_000;

export const streamService = {
  /** Another User's stream reads as absent, as their Session would (ADR-0010 §2). */
  async assertOwner(streamId: string, userId: string): Promise<void> {
    const owner = await findStreamOwner(streamId);
    if (owner !== userId) {
      throw new NotFoundError('Stream', streamId);
    }
  },

  /** Relays a reply stream from its start as SSE until `end`, or until `signal` aborts. Transport only. */
  async relay(
    streamId: string,
    write: (chunk: string) => void,
    signal: AbortSignal,
    logger: StreamLogger,
  ): Promise<void> {
    const reader = openReplyStream(streamId);
    // Closing the reader drops its connection, which ends a blocking read at once.
    const stop = () => reader.close();
    signal.addEventListener('abort', stop, { once: true });
    let afterId = '0';
    try {
      while (!signal.aborted) {
        const entries = await reader.read(afterId, RELAY_BLOCK_MS);
        if (entries.length === 0) {
          write(SSE_KEEP_ALIVE);
          continue;
        }
        for (const entry of entries) {
          afterId = entry.id;
          // An event this server cannot read (say, a newer worker's) is skipped, so the contract can grow.
          const event = parseReplyStreamEvent(entry.payload);
          if (!event) continue;
          write(sseEvent(event, entry.id));
          if (event.type === 'end') return;
        }
      }
    } catch (err) {
      if (signal.aborted) return;
      logEvent(
        componentLogger(logger, 'redis'),
        'error',
        'chat.stream.relay.failed',
        { err },
        'Reply stream relay failed; ending the response',
      );
      write(sseEvent({ type: 'error', ...INTERNAL_ERROR_ENVELOPE }));
      write(sseEvent({ type: 'end' }));
    } finally {
      signal.removeEventListener('abort', stop);
      reader.close();
    }
  },
};
