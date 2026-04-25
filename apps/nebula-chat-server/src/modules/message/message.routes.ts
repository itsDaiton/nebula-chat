import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { errorResponseSchema } from '@backend/errors/error.schema';
import { messageController } from '@backend/modules/message/message.controller';
import {
  createMessageSchema,
  getMessagesSchema,
  messageResponseSchema,
  messagesArraySchema,
} from '@backend/modules/message/message.validation';

const messageRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post('/', {
    schema: {
      description: 'Create a new message in a conversation',
      summary: 'Create message',
      tags: ['Messages'],
      operationId: 'createMessage',
      body: createMessageSchema,
      response: {
        201: messageResponseSchema.describe('Message created successfully'),
        400: errorResponseSchema.describe('Invalid request body'),
        500: errorResponseSchema.describe('Internal server error'),
      },
    },
    handler: messageController.create,
  });

  app.get('/:messageId', {
    schema: {
      description: 'Retrieve a specific message by ID',
      summary: 'Get message by ID',
      tags: ['Messages'],
      operationId: 'getMessage',
      params: getMessagesSchema,
      response: {
        200: messageResponseSchema.describe('Message retrieved successfully'),
        400: errorResponseSchema.describe('Invalid message ID format'),
        404: errorResponseSchema.describe('Message not found'),
        500: errorResponseSchema.describe('Internal server error'),
      },
    },
    handler: messageController.get,
  });

  app.get('/', {
    schema: {
      description: 'Retrieve all messages across all conversations',
      summary: 'List all messages',
      tags: ['Messages'],
      operationId: 'listMessages',
      response: {
        200: messagesArraySchema.describe('List of messages'),
        500: errorResponseSchema.describe('Internal server error'),
      },
    },
    handler: messageController.getAll,
  });
};

export default messageRoutes;
