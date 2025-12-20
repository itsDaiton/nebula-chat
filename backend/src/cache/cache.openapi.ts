import { registry } from '@backend/config/openapi.config';
import { errorResponseSchema } from '@backend/openapi/schemas';
import {
  cacheStatsResponseSchema,
  cacheKeysResponseSchema,
  cacheClearResponseSchema,
  cacheHealthResponseSchema,
} from './cache.validation';

export function registerCacheRoutes() {
  registry.registerPath({
    method: 'get',
    path: '/api/cache/stats',
    description: 'Get cache statistics including hit/miss rates and performance metrics',
    summary: 'Get cache statistics',
    tags: ['Cache'],
    responses: {
      200: {
        description: 'Cache statistics retrieved successfully',
        content: {
          'application/json': {
            schema: cacheStatsResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });
  registry.registerPath({
    method: 'get',
    path: '/api/cache/keys',
    description: 'Get list of recent cache keys',
    summary: 'Get cache keys',
    tags: ['Cache'],
    responses: {
      200: {
        description: 'Cache keys retrieved successfully',
        content: {
          'application/json': {
            schema: cacheKeysResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });
  registry.registerPath({
    method: 'delete',
    path: '/api/cache/clear',
    description: 'Clear all cached data',
    summary: 'Clear cache',
    tags: ['Cache'],
    responses: {
      200: {
        description: 'Cache cleared successfully',
        content: {
          'application/json': {
            schema: cacheClearResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });
  registry.registerPath({
    method: 'get',
    path: '/api/cache/health',
    description: 'Check cache system health status',
    summary: 'Cache health check',
    tags: ['Cache'],
    responses: {
      200: {
        description: 'Cache health status',
        content: {
          'application/json': {
            schema: cacheHealthResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });
}
