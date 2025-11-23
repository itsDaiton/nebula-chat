import { getCacheStats } from '@backend/utils/memoryCache';
import { Router } from 'express';

const cacheRoutes = Router();

cacheRoutes.get('/stats', (req, res) => {
  res.json({
    success: true,
    stats: getCacheStats(),
  });
});

export { cacheRoutes };
