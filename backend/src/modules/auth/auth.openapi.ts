import { registry } from '@backend/config/openapi.config';
import { errorResponseSchema } from '@backend/openapi/schemas';
import { sessionTokenResponseSchema } from './auth.validation';
import { z } from 'zod';

export function registerAuthRoutes() {
  registry.registerPath({
    method: 'post',
    path: '/api/auth/session',
    description:
      'Generate a new session access token using the bootstrap secret. The token is valid for 20 minutes.',
    summary: 'Create session token',
    tags: ['Authentication'],
    request: {
      headers: z.object({
        'x-nebula-bootstrap': z.string().describe('Bootstrap secret for token generation'),
      }),
    },
    responses: {
      200: {
        description: 'Session token created successfully',
        content: {
          'application/json': {
            schema: sessionTokenResponseSchema,
          },
        },
      },
      400: {
        description: 'Missing bootstrap secret in request headers',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
      401: {
        description: 'Invalid bootstrap secret',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
      429: {
        description: 'Too many requests - rate limit exceeded',
        content: {
          'application/json': {
            schema: errorResponseSchema,
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
