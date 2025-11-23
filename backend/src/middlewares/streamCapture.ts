import type { Request, Response, NextFunction } from 'express';
import { generateKey, saveToCache } from '../utils/memoryCache';

export function streamCapture(req: Request, res: Response, next: NextFunction) {
  const key = generateKey(req.body);

  let full = '';
  const originalWrite = res.write.bind(res);

  res.write = (chunk: any, ...args: unknown[]) => {
    try {
      full += typeof chunk === 'string' ? chunk : chunk.toString();
    } catch {}
    return originalWrite(chunk, ...(args as any));
  };

  res.on('finish', () => {
    if (full.trim() !== '') {
      //eslint-disable-next-line no-console
      console.log('Saving to cache');
      saveToCache(key, full);
    }
  });

  next();
}
