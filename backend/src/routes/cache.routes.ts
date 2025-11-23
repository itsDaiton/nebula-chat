import { clearCache, getCacheStats, getRecentKeys } from '@backend/utils/memoryCache';
import { Router } from 'express';

const cacheRoutes = Router();

cacheRoutes.get('/stats', (req, res) => {
  res.json({
    success: true,
    stats: getCacheStats(),
  });
});

cacheRoutes.delete('/clear', (req, res) => {
  clearCache();
  res.json({
    success: true,
    message: 'Cache cleared successfully.',
  });
});

cacheRoutes.get('/keys', (req, res) => {
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 1000));
  const keys = getRecentKeys(limit);
  res.json({
    success: true,
    count: keys.length,
    keys,
  });
});

export { cacheRoutes };
