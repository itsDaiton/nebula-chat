import { cacheController } from '@backend/cache/cache.controller';
import { Router } from 'express';

const cacheRoutes = Router();

cacheRoutes.get('/stats', cacheController.getStats);
cacheRoutes.delete('/clear', cacheController.clear);
cacheRoutes.get('/keys', cacheController.getKeys);

export { cacheRoutes };
