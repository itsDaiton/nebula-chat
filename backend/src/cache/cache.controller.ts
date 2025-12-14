import { cacheService } from '@backend/cache/cache.service';
import type { Request, Response, NextFunction } from 'express';
import { cacheConfig } from './cache.config';

export const cacheController = {
  async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await cacheService.getCacheStats();
      return res.status(200).json({
        success: true,
        stats,
      });
    } catch (error) {
      next(error);
    }
  },
  async getKeys(req: Request, res: Response, next: NextFunction) {
    try {
      const keys = await cacheService.getRecentKeys(cacheConfig.keyLimit);
      return res.status(200).json({
        success: true,
        count: keys.length,
        keys,
      });
    } catch (error) {
      next(error);
    }
  },
  async clear(_req: Request, res: Response, next: NextFunction) {
    try {
      await cacheService.clearCache();
      return res.status(200).json({
        success: true,
        message: 'Cache cleared successfully.',
      });
    } catch (error) {
      next(error);
    }
  },
  async healthCheck(_req: Request, res: Response, next: NextFunction) {
    try {
      const health = await cacheService.healthCheck();
      return res.status(200).json(health);
    } catch (error) {
      next(error);
    }
  },
};
