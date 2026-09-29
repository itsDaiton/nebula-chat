import type { FastifyPluginAsyncZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { conversationController } from '@backend/modules/conversation/conversation.controller';
import { requireAuthentication } from '@backend/plugins/authGate.plugin';
import {
  conversationResponseSchema,
  conversationsArraySchema,
  createConversationSchema,
  getConversationSchema,
  getConversationsQuerySchema,
  paginatedConversationsResponseSchema,
  searchConversationsQuerySchema,
} from '@backend/modules/conversation/conversation.validation';
import { jsonResponse } from '@backend/utils/jsonResponse';

const conversationRoutes: FastifyPluginAsyncZodOpenApi = async (app) => {
  app.post('', {
    schema: {
      description: 'Create a new conversation with a title',
      summary: 'Create conversation',
      tags: ['Conversations'],
      operationId: 'createConversation',
      body: createConversationSchema,
      response: {
        201: jsonResponse('Conversation created successfully', conversationResponseSchema),
        400: jsonResponse('Invalid request body', errorEnvelopeSchema),
        401: jsonResponse('No authenticated session', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    // A conversation needs an owner (conversations.userId is NOT NULL), so the
    // session user is required; the owner id is read from the session, never the body.
    preHandler: requireAuthentication,
    handler: conversationController.create,
  });

  app.get('/search', {
    schema: {
      description: 'Search the caller’s own conversations by title, ordered by creation date.',
      summary: 'Search conversations',
      tags: ['Conversations'],
      operationId: 'searchConversations',
      querystring: searchConversationsQuerySchema,
      response: {
        200: jsonResponse('Matching conversations owned by the caller', conversationsArraySchema),
        400: jsonResponse('Invalid search query', errorEnvelopeSchema),
        401: jsonResponse('No authenticated session', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    // Owner-scoped: results are filtered to the session user (ADR-0010 §2).
    preHandler: requireAuthentication,
    handler: conversationController.search,
  });

  app.get('/:conversationId', {
    schema: {
      description: 'Retrieve one of the caller’s own conversations by ID',
      summary: 'Get conversation by ID',
      tags: ['Conversations'],
      operationId: 'getConversation',
      params: getConversationSchema,
      response: {
        200: jsonResponse('Conversation retrieved successfully', conversationResponseSchema),
        400: jsonResponse('Invalid conversation ID format', errorEnvelopeSchema),
        401: jsonResponse('No authenticated session', errorEnvelopeSchema),
        404: jsonResponse('Conversation not found or not owned by the caller', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    // Owner-scoped: another user's conversation reads as 404, never 403 (no leak).
    preHandler: requireAuthentication,
    handler: conversationController.get,
  });

  app.get('', {
    schema: {
      description:
        'Retrieve the caller’s own conversations with cursor-based pagination. Returns up to 10 conversations by default.',
      summary: 'List conversations',
      tags: ['Conversations'],
      operationId: 'listConversations',
      querystring: getConversationsQuerySchema,
      response: {
        200: jsonResponse(
          'Paginated list of conversations owned by the caller',
          paginatedConversationsResponseSchema,
        ),
        401: jsonResponse('No authenticated session', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    // Owner-scoped: only the session user's conversations are listed (ADR-0010 §2).
    preHandler: requireAuthentication,
    handler: conversationController.getAll,
  });
};

export default conversationRoutes;
