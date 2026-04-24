import type { FastifyPluginAsync } from 'fastify';
import { cacheController } from '@backend/cache/cache.controller';

const cacheRoutes: FastifyPluginAsync = async (app) => {
  app.get('/stats', cacheController.getStats);
  app.delete('/clear', cacheController.clear);
  app.get('/keys', cacheController.getKeys);
  app.get('/health', cacheController.healthCheck);
};

export default cacheRoutes;
