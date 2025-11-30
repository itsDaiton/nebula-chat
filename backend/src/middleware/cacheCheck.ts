import type { Request, Response, NextFunction } from 'express';
import { generateKey, getFromCache } from '../cache/cache';
import { setCacheHeaders } from '@backend/config/headers.config';
import type { CachedStreamData } from '@backend/cache/cache.types';
import { streamFormatter } from '@backend/modules/chat/chat.utils';

export const cacheCheck = (req: Request, res: Response, next: NextFunction) => {
  const key = generateKey(req.body);
  const cachedResponse = getFromCache(key);
  if (!cachedResponse) {
    return next();
  }
  //eslint-disable-next-line no-console
  console.log('Cache hit');

  setCacheHeaders(res, req.headers.origin);
  res.flushHeaders();

  streamFormatter.writeCacheHit(res);

  try {
    const cachedData: CachedStreamData = JSON.parse(cachedResponse);
    res.write(cachedData.tokens.trimEnd());
    res.write('\n\n');
    streamFormatter.writeUsage(res, {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
  } catch {
    res.write(cachedResponse);
  }

  streamFormatter.writeEnd(res);
  return res.end();
};
