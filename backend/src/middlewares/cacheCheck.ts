import type { Request, Response, NextFunction } from 'express';
import { generateKey, getFromCache } from '../utils/memoryCache';
import { setCacheHeaders } from '@backend/configs/headers.config';

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

  res.write(`event: cache-hit\n`);
  res.write(`data: true\n\n`);

  res.write(cachedResponse);

  res.write(`event: usage\n`);
  res.write(`data: {"promptTokens":0,"completionTokens":0,"totalTokens":0}\n\n`);

  res.write(`event: end\n`);
  res.write(`data: end\n\n`);

  return res.end();
};
