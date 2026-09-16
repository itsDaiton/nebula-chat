import fp from 'fastify-plugin';
import { redis, closeRedis } from '@backend/redis';

export default fp(async (app) => {
  app.decorate('redis', redis);
  app.addHook('onClose', closeRedis);
});
