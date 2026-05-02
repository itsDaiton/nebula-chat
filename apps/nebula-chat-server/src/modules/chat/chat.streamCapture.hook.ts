import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { cacheService } from '@backend/cache/cache.service';
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

  let full = '';
  const raw = reply.raw;
  const originalWrite = raw.write.bind(raw);

  raw.write = ((chunk: Parameters<typeof raw.write>[0], ...args: unknown[]) => {
    try {
      full += typeof chunk === 'string' ? chunk : chunk.toString();
    } catch (err) {
      req.log.error(err, 'Error capturing stream chunk');
    }
    return (originalWrite as unknown as (...a: unknown[]) => boolean)(chunk, ...args);
  }) as typeof raw.write;

  raw.on('finish', () => {
    if (full.trim() === '') {
      return;
    }

    const usageData = extractUsageFromStream(full);

    // Strip usage and end events (and their data lines) from cached content.
    let skipNextData = false;
    const filtered = full
      .split('\n')
      .filter((line) => {
        if (line.startsWith('event: usage') || line.startsWith('event: end')) {
          skipNextData = true;
          return false;
        }
        if (line.includes('"promptTokens"')) {
          skipNextData = false;
          return false;
        }
        if (skipNextData && line.startsWith('data: ')) {
          skipNextData = false;
          return false;
        }
        skipNextData = false;
        return true;
      })
      .join('\n');

    const finalKey = cacheService.generateKey(req.body as CreateChatStreamDTO);

    req.log.info('Redis: Saving to cache');
    cacheService.saveToCache(finalKey, filtered, usageData ?? undefined).catch((error) => {
      req.log.error(error, 'Error saving to cache (fail-open)');
    });
  });
};
