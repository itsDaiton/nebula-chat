import type { Request, Response, NextFunction } from 'express';
import { generateKey, saveToCache } from '../cache/cache';
import { streamFormatter } from '@backend/modules/chat/chat.utils';

export function streamCapture(req: Request, res: Response, next: NextFunction) {
  const key = generateKey(req.body);

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

      //eslint-disable-next-line no-console
      console.log('Saving to cache');
      saveToCache(key, filtered, usageData);
    }
  });

  next();
}
