import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { errorResponseSchema } from '@backend/errors/error.schema';
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

const conversationRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post('', {
    schema: {
      description: 'Create a new conversation with a title',
      summary: 'Create conversation',
      tags: ['Conversations'],
      operationId: 'createConversation',
      body: createConversationSchema,
      response: {
        201: conversationResponseSchema.describe('Conversation created successfully'),
        400: errorResponseSchema.describe('Invalid request body'),
        401: errorResponseSchema.describe('No authenticated session'),
        500: errorResponseSchema.describe('Internal server error'),
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
        200: conversationsArraySchema.describe('Matching conversations owned by the caller'),
        400: errorResponseSchema.describe('Invalid search query'),
        401: errorResponseSchema.describe('No authenticated session'),
        500: errorResponseSchema.describe('Internal server error'),
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
        200: conversationResponseSchema.describe('Conversation retrieved successfully'),
        400: errorResponseSchema.describe('Invalid conversation ID format'),
        401: errorResponseSchema.describe('No authenticated session'),
        404: errorResponseSchema.describe('Conversation not found or not owned by the caller'),
        500: errorResponseSchema.describe('Internal server error'),
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
        200: paginatedConversationsResponseSchema.describe(
          'Paginated list of conversations owned by the caller',
        ),
        401: errorResponseSchema.describe('No authenticated session'),
        500: errorResponseSchema.describe('Internal server error'),
      },
    },
    // Owner-scoped: only the session user's conversations are listed (ADR-0010 §2).
    preHandler: requireAuthentication,
    handler: conversationController.getAll,
  });
};

export default conversationRoutes;
