import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { cacheService } from '@backend/cache/cache.service';
import type { CreateChatStreamDTO } from '@backend/modules/chat/chat.types';
import { streamFormatter } from '@backend/modules/chat/chat.utils';

export const streamCaptureHook: preHandlerAsyncHookHandler = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  if (reply.sent || reply.raw.writableEnded) {
    return;
  }

  let full = '';
  const raw = reply.raw;
  const originalWrite = raw.write.bind(raw) as typeof raw.write;

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
    const usageData = streamFormatter.extractUsageFromStream(full);
    const filtered = full
      .split('\n')
      .filter((line) => {
        if (line.startsWith('event: usage')) return false;
        if (line.startsWith('event: end')) return false;
        if (line.includes('"promptTokens"')) return false;
        if (line === 'data: end') return false;
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
