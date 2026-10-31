import { parseReplyStreamEvent } from '@nebula-chat/contracts';
import { INTERNAL_ERROR_ENVELOPE, NotFoundError } from '@nebula-chat/errors';
import { componentLogger, logEvent } from '@nebula-chat/otel';
import { runService } from '@server/modules/run/run.service';
import {
  findStreamOwner,
  isStreamEnded,
  isStreamExpired,
  openReplyStream,
  requestStreamCancel,
} from '@server/redis';
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

  /**
   * The owner check, plus: a stream whose TTL has passed reads as absent, so the client falls
   * back to the persisted Message. One whose job is still queued is readable, and the relay waits.
   */
  async assertReadable(streamId: string, userId: string): Promise<void> {
    await streamService.assertOwner(streamId, userId);
    if (await isStreamExpired(streamId)) {
      throw new NotFoundError('Stream', streamId);
    }
  },

  /** Asks the worker to stop the reply; a reply that already finished is left alone (ADR-0014). */
  async cancel(streamId: string, userId: string, logger: StreamLogger): Promise<void> {
    await streamService.assertOwner(streamId, userId);
    if (await isStreamEnded(streamId)) {
      // A stream that ended on a Clarifying question leaves a waiting Run that this stop cancels.
      await runService.cancelWaitingRunOfStream(streamId, userId, logger);
      return;
    }
    await requestStreamCancel(streamId);
    logEvent(
      componentLogger(logger, 'chat'),
      'info',
      'chat.reply.cancel.requested',
      { 'nebula.reply.message.id': streamId },
      'Direct reply stop requested',
    );
  },

  /**
   * Relays a reply stream as SSE from after `afterId` (`'0'` for its start) until `end`, or until
   * `signal` aborts. Transport only.
   */
  async relay(
    streamId: string,
    afterId: string,
    write: (chunk: string) => void,
    signal: AbortSignal,
    logger: StreamLogger,
  ): Promise<void> {
    const reader = openReplyStream(streamId);
    // Closing the reader drops its connection, which ends a blocking read at once.
    const stop = () => reader.close();
    signal.addEventListener('abort', stop, { once: true });
    let lastId = afterId;
    try {
      while (!signal.aborted) {
        const entries = await reader.read(lastId, RELAY_BLOCK_MS);
        if (entries.length === 0) {
          write(SSE_KEEP_ALIVE);
          continue;
        }
        for (const entry of entries) {
          lastId = entry.id;
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
