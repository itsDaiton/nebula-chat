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

  res.write(cachedResponse);
  return res.end();
};
