import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { sessionController } from '@backend/modules/session/session.controller';
import { requireAuthentication } from '@backend/plugins/authGate.plugin';
import {
  sessionDetailResponseSchema,
  sessionResponseSchema,
  sessionsArraySchema,
  createSessionSchema,
  getSessionSchema,
  getSessionsQuerySchema,
  paginatedSessionsResponseSchema,
  searchSessionsQuerySchema,
} from '@backend/modules/session/session.validation';
import { jsonResponse } from '@backend/utils/jsonResponse';

const sessionRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.post('', {
    schema: {
      description: 'Create a new session with a title',
      summary: 'Create session',
      tags: ['Sessions'],
      operationId: 'createSession',
      body: createSessionSchema,
      response: {
        201: jsonResponse('Session created successfully', sessionResponseSchema),
        400: jsonResponse('Invalid request body', errorEnvelopeSchema),
        401: jsonResponse('No auth session', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    // A Session needs an owner (sessions.userId is NOT NULL), so an auth
    // session is required; the owner id is read from it, never the body.
    preHandler: requireAuthentication,
    handler: sessionController.create,
  });

  app.get('/search', {
    schema: {
      description: 'Search the caller’s own sessions by title, ordered by creation date.',
      summary: 'Search sessions',
      tags: ['Sessions'],
      operationId: 'searchSessions',
      querystring: searchSessionsQuerySchema,
      response: {
        200: jsonResponse('Matching sessions owned by the caller', sessionsArraySchema),
        400: jsonResponse('Invalid search query', errorEnvelopeSchema),
        401: jsonResponse('No auth session', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    // Owner-scoped: results are filtered to the auth session's user (ADR-0010 §2).
    preHandler: requireAuthentication,
    handler: sessionController.search,
  });

  app.get('/:sessionId', {
    schema: {
      description: 'Retrieve one of the caller’s own sessions by ID',
      summary: 'Get session by ID',
      tags: ['Sessions'],
      operationId: 'getSession',
      params: getSessionSchema,
      response: {
        200: jsonResponse('Session retrieved successfully', sessionDetailResponseSchema),
        400: jsonResponse('Invalid session ID format', errorEnvelopeSchema),
        401: jsonResponse('No auth session', errorEnvelopeSchema),
        404: jsonResponse('Session not found or not owned by the caller', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    // Owner-scoped: another user's session reads as 404, never 403 (no leak).
    preHandler: requireAuthentication,
    handler: sessionController.get,
  });

  app.get('', {
    schema: {
      description:
        'Retrieve the caller’s own sessions with cursor-based pagination. Returns up to 10 sessions by default.',
      summary: 'List sessions',
      tags: ['Sessions'],
      operationId: 'listSessions',
      querystring: getSessionsQuerySchema,
      response: {
        200: jsonResponse(
          'Paginated list of sessions owned by the caller',
          paginatedSessionsResponseSchema,
        ),
        401: jsonResponse('No auth session', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    // Owner-scoped: only the auth session's user's Sessions are listed (ADR-0010 §2).
    preHandler: requireAuthentication,
    handler: sessionController.getAll,
  });
  done();
};

export default sessionRoutes;
