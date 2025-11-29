import type { Request, Response, NextFunction } from 'express';
import { generateKey, saveToCache } from '../shared/utils/memoryCache';

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
      const filtered = full
        .split('\n')
        .filter((line) => {
          if (line.startsWith('event: usage')) return false;
          if (line.includes('\"promptTokens\"')) return false;
          return true;
        })
        .join('\n');

      //eslint-disable-next-line no-console
      console.log('Saving to cache');
      saveToCache(key, filtered);
    }
  });

  next();
}
