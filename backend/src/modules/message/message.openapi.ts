import { registry } from '@backend/config/openapi.config';
import { errorResponseSchema } from '@backend/openapi/schemas';
import {
  createMessageSchema,
  getMessagesSchema,
  messageResponseSchema,
  messagesArraySchema,
} from './message.validation';

export function registerMessageRoutes() {
  registry.registerPath({
    method: 'post',
    path: '/api/messages',
    description: 'Create a new message in a conversation',
    summary: 'Create message',
    tags: ['Messages'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: createMessageSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Message created successfully',
        content: {
          'application/json': {
            schema: messageResponseSchema,
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
    path: '/api/messages/{messageId}',
    description: 'Retrieve a specific message by ID',
    summary: 'Get message by ID',
    tags: ['Messages'],
    request: {
      params: getMessagesSchema,
    },
    responses: {
      200: {
        description: 'Message retrieved successfully',
        content: {
          'application/json': {
            schema: messageResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid message ID format',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
      404: {
        description: 'Message not found',
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
    path: '/api/messages',
    description: 'Retrieve all messages across all conversations',
    summary: 'List all messages',
    tags: ['Messages'],
    responses: {
      200: {
        description: 'List of messages',
        content: {
          'application/json': {
            schema: messagesArraySchema,
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
