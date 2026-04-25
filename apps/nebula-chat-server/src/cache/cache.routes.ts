import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { cacheController } from '@backend/cache/cache.controller';
import {
  cacheClearResponseSchema,
  cacheHealthResponseSchema,
  cacheKeysResponseSchema,
  cacheStatsResponseSchema,
} from '@backend/cache/cache.validation';
import { errorResponseSchema } from '@backend/errors/error.schema';

const cacheRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/stats', {
    schema: {
      description: 'Get cache statistics including hit/miss rates and performance metrics',
      summary: 'Get cache statistics',
      tags: ['Cache'],
      operationId: 'getCacheStats',
      response: {
        200: cacheStatsResponseSchema,
        500: errorResponseSchema,
      },
    },
    handler: cacheController.getStats,
  });

  app.delete('/clear', {
    schema: {
      description: 'Clear all cached data',
      summary: 'Clear cache',
      tags: ['Cache'],
      operationId: 'clearCache',
      response: {
        200: cacheClearResponseSchema,
        500: errorResponseSchema,
      },
    },
    handler: cacheController.clear,
  });

  app.get('/keys', {
    schema: {
      description: 'Get list of recent cache keys',
      summary: 'Get cache keys',
      tags: ['Cache'],
      operationId: 'getCacheKeys',
      response: {
        200: cacheKeysResponseSchema,
        500: errorResponseSchema,
      },
    },
    handler: cacheController.getKeys,
  });

  app.get('/health', {
    schema: {
      description: 'Check cache system health status',
      summary: 'Cache health check',
      tags: ['Cache'],
      operationId: 'getCacheHealth',
      response: {
        200: cacheHealthResponseSchema,
        500: errorResponseSchema,
      },
    },
    handler: cacheController.healthCheck,
  });
};

export default cacheRoutes;
