import { registry } from '@backend/config/openapi.config';
import { errorResponseSchema } from '@backend/openapi/schemas';
import {
  createConversationSchema,
  conversationResponseSchema,
  getConversationSchema,
  paginatedConversationsResponseSchema,
  getConversationsQuerySchema,
} from './conversation.validation';

export function registerConversationRoutes() {
  registry.registerPath({
    method: 'post',
    path: '/api/conversations',
    description: 'Create a new conversation with a title',
    summary: 'Create conversation',
    tags: ['Conversations'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: createConversationSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Conversation created successfully',
        content: {
          'application/json': {
            schema: conversationResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request body',
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
  registry.registerPath({
    method: 'get',
    path: '/api/conversations/{conversationId}',
    description: 'Retrieve a specific conversation by ID',
    summary: 'Get conversation by ID',
    tags: ['Conversations'],
    request: {
      params: getConversationSchema,
    },
    responses: {
      200: {
        description: 'Conversation retrieved successfully',
        content: {
          'application/json': {
            schema: conversationResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid conversation ID format',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
      404: {
        description: 'Conversation not found',
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
  registry.registerPath({
    method: 'get',
    path: '/api/conversations',
    description:
      'Retrieve conversations with cursor-based pagination. Returns up to 20 conversations by default.',
    summary: 'List conversations',
    tags: ['Conversations'],
    request: {
      query: getConversationsQuerySchema,
    },
    responses: {
      200: {
        description: 'Paginated list of conversations',
        content: {
          'application/json': {
            schema: paginatedConversationsResponseSchema,
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
