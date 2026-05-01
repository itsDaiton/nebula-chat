import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { errorResponseSchema } from '@backend/errors/error.schema';
import { conversationController } from '@backend/modules/conversation/conversation.controller';
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
        500: errorResponseSchema.describe('Internal server error'),
      },
    },
    handler: conversationController.create,
  });

  app.get('/search', {
    schema: {
      description:
        'Search conversations by title. Returns matching conversations ordered by creation date.',
      summary: 'Search conversations',
      tags: ['Conversations'],
      operationId: 'searchConversations',
      querystring: searchConversationsQuerySchema,
      response: {
        200: conversationsArraySchema.describe('Matching conversations'),
        400: errorResponseSchema.describe('Invalid search query'),
        500: errorResponseSchema.describe('Internal server error'),
      },
    },
    handler: conversationController.search,
  });

  app.get('/:conversationId', {
    schema: {
      description: 'Retrieve a specific conversation by ID',
      summary: 'Get conversation by ID',
      tags: ['Conversations'],
      operationId: 'getConversation',
      params: getConversationSchema,
      response: {
        200: conversationResponseSchema.describe('Conversation retrieved successfully'),
        400: errorResponseSchema.describe('Invalid conversation ID format'),
        404: errorResponseSchema.describe('Conversation not found'),
        500: errorResponseSchema.describe('Internal server error'),
      },
    },
    handler: conversationController.get,
  });

  app.get('', {
    schema: {
      description:
        'Retrieve conversations with cursor-based pagination. Returns up to 10 conversations by default.',
      summary: 'List conversations',
      tags: ['Conversations'],
      operationId: 'listConversations',
      querystring: getConversationsQuerySchema,
      response: {
        200: paginatedConversationsResponseSchema.describe('Paginated list of conversations'),
        500: errorResponseSchema.describe('Internal server error'),
      },
    },
    handler: conversationController.getAll,
  });
};

export default conversationRoutes;
