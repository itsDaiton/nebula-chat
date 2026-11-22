import fp from 'fastify-plugin';
import { ForbiddenError } from '@nebula-chat/errors';
import { allowedOrigins } from '@server/config/cors.config';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// onRequest, before any body is read; no Origin (CLI, server to server) passes, `Origin: null` is present and unlisted.
export default fp(
  async (app) => {
    app.addHook('onRequest', async (req) => {
      const { origin } = req.headers;
      if (MUTATING_METHODS.has(req.method) && origin !== undefined && !allowedOrigins.has(origin)) {
        throw new ForbiddenError('Origin not allowed');
      }
    });
  },
  { name: 'originCheck' },
);
