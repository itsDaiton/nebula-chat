import type { Request, Response, NextFunction } from 'express';
import { cacheService } from '@backend/cache/cache.service';
import { streamFormatter } from '@backend/modules/chat/chat.utils';

export function streamCapture(req: Request, res: Response, next: NextFunction) {
  let full = '';
  const originalWrite = res.write.bind(res);

  res.write = (chunk: any, ...args: unknown[]) => {
    try {
      full += typeof chunk === 'string' ? chunk : chunk.toString();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error capturing stream chunk:', err);
    }
    return originalWrite(chunk, ...(args as any));
  };

  res.on('finish', () => {
    if (full.trim() !== '') {
      const usageData = streamFormatter.extractUsageFromStream(full);
      const filtered = full
        .split('\n')
        .filter((line) => {
          if (line.startsWith('event: usage')) return false;
          if (line.startsWith('event: end')) return false;
          if (line.includes('\"promptTokens\"')) return false;
          if (line === 'data: end') return false;
          return true;
        })
        .join('\n');

      // Regenerate cache key with the actual conversation ID (in case it was created during the request)
      const finalKey = cacheService.generateKey(req.body);

      //eslint-disable-next-line no-console
      console.log('Saving to cache');
      cacheService.saveToCache(finalKey, filtered, usageData).catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Error saving to cache (fail-open):', error);
      });
    }
  });
  next();
}
