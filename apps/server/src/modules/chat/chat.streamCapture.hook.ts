import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { componentLogger, logEvent } from '@nebula-chat/otel';
import { chatCacheKey, saveCachedStream } from '@backend/redis';
import type { CreateChatStreamDTO, UsageData } from '@backend/modules/chat/chat.types';

const extractUsageFromStream = (stream: string): UsageData | null => {
  const lines = stream.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1];
    if (
      currentLine &&
      nextLine &&
      currentLine.startsWith('event: usage') &&
      nextLine.startsWith('data: ')
    ) {
      try {
        const data = JSON.parse(nextLine.substring(6));
        return {
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          totalTokens: data.totalTokens,
        };
      } catch {
        return null;
      }
    }
  }
  return null;
};

export const streamCaptureHook: preHandlerAsyncHookHandler = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  if (reply.sent || reply.raw.writableEnded) {
    return;
  }

  // Fail-open like the cache itself: a capture or save failure is a `warn`,
  // and the reply the user already received is unaffected.
  const log = componentLogger(req.log, 'redis');
  let full = '';
  const raw = reply.raw;
  const originalWrite = raw.write.bind(raw);

  raw.write = ((chunk: Parameters<typeof raw.write>[0], ...args: unknown[]) => {
    try {
      full += typeof chunk === 'string' ? chunk : chunk.toString();
    } catch (err) {
      logEvent(
        log,
        'warn',
        'cache.capture.failed',
        { err },
        'Could not capture a stream chunk for the cache',
      );
    }
    return (originalWrite as unknown as (...a: unknown[]) => boolean)(chunk, ...args);
  }) as typeof raw.write;

  raw.on('finish', () => {
    if (full.trim() === '') {
      return;
    }

    const usageData = extractUsageFromStream(full);

    // Strip usage, end, and error events plus the immediate data line that follows.
    let skipNextData = false;
    const filtered = full
      .split('\n')
      .filter((line) => {
        if (
          line.startsWith('event: usage') ||
          line.startsWith('event: end') ||
          line.startsWith('event: error')
        ) {
          skipNextData = true;
          return false;
        }
        if (skipNextData && line.startsWith('data: ')) {
          skipNextData = false;
          return false;
        }
        if (skipNextData) {
          skipNextData = false;
        }
        return true;
      })
      .join('\n');

    const finalKey = chatCacheKey(req.body as CreateChatStreamDTO);

    logEvent(
      log,
      'debug',
      'cache.saved',
      { 'nebula.cache.key': finalKey },
      'Saving the reply to the cache',
    );
    saveCachedStream(finalKey, filtered, usageData ?? undefined).catch((error: unknown) => {
      logEvent(
        log,
        'warn',
        'cache.write.failed',
        { err: error, 'nebula.cache.key': finalKey },
        'Cache write failed; continuing without caching',
      );
    });
  });
};
