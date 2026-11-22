import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';

// Render keeps a client-sent X-Forwarded-For; Cloudflare sets CF-Connecting-IP itself, as better-auth reads it.
export default fp(async (app) => {
  await app.register(rateLimit, {
    global: false,
    keyGenerator: (req) => {
      const header = req.headers['cf-connecting-ip'];
      return (typeof header === 'string' && header.trim()) || req.ip;
    },
  });
});
