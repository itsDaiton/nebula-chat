import type { Request, Response, NextFunction } from 'express';
import { cacheService } from '@backend/cache/cache.service';
import { setCacheHeaders } from '@backend/config/headers.config';
import { streamFormatter } from '@backend/modules/chat/chat.utils';

export const cacheCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = cacheService.generateKey(req.body);
    const cachedData = await cacheService.getFromCache(key);

    if (!cachedData) {
      return next();
    }
    //eslint-disable-next-line no-console
    console.log('Cache hit');

    setCacheHeaders(res, req.headers.origin);
    res.flushHeaders();

    streamFormatter.writeCacheHit(res);
    res.write(cachedData.tokens.trimEnd());
    res.write('\n\n');
    streamFormatter.writeUsage(res, {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
    streamFormatter.writeEnd(res);
    return res.end();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Cache check error (fail-open):', error);
    return next();
  }
};
