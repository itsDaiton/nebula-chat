import fp from 'fastify-plugin';
import { ForbiddenError } from '@nebula-chat/errors';
import { allowedOrigins } from '@server/config/cors.config';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * onRequest, so it runs before any body is read: a mutation whose Origin is present but not allowlisted is refused.
 * A request with no Origin (CLI, server to server) passes; `Origin: null` is a present, unlisted value.
 */
export default fp(
  async (app) => {
    app.addHook('onRequest', async (req) => {
      const { origin } = req.headers;
      if (MUTATING.has(req.method) && origin !== undefined && !allowedOrigins.has(origin)) {
        throw new ForbiddenError('Origin not allowed');
      }
    });
  },
  { name: 'originCheck' },
);
