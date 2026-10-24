import fp from 'fastify-plugin';
import { closeQueue } from '@server/queue';
import { redis, closeRedis } from '@server/redis';

export default fp(async (app) => {
  app.decorate('redis', redis);
  // The queue runs on a connection the toolkit owns, so it closes first.
  app.addHook('onClose', async () => {
    await closeQueue();
    await closeRedis();
  });
});
