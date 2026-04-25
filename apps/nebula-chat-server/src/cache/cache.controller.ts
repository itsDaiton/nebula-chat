import type { FastifyReply, FastifyRequest } from 'fastify';
import { cacheConfig } from '@backend/cache/cache.config';
import { cacheService } from '@backend/cache/cache.service';

export const cacheController = {
  async getStats(_req: FastifyRequest, reply: FastifyReply) {
    const stats = await cacheService.getCacheStats();
    return reply.status(200).send({
      success: true,
      stats,
    });
  },
  async getKeys(_req: FastifyRequest, reply: FastifyReply) {
    const keys = await cacheService.getRecentKeys(cacheConfig.keyLimit);
    return reply.status(200).send({
      success: true,
      count: keys.length,
      keys,
    });
  },
  async clear(_req: FastifyRequest, reply: FastifyReply) {
    await cacheService.clearCache();
    return reply.status(200).send({
      success: true,
      message: 'Cache cleared successfully.',
    });
  },
  async healthCheck(_req: FastifyRequest, reply: FastifyReply) {
    const health = await cacheService.healthCheck();
    return reply.status(200).send(health);
  },
};
