import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { errorResponseSchema } from '@backend/errors/error.schema';
import { messageController } from '@backend/modules/message/message.controller';
import { requireUser } from '@backend/plugins/auth.plugin';
import {
  createMessageSchema,
  getMessagesSchema,
  messageResponseSchema,
  messagesArraySchema,
} from '@backend/modules/message/message.validation';

const messageRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post('', {
    schema: {
      description: 'Create a new message in one of the caller’s own conversations',
      summary: 'Create message',
      tags: ['Messages'],
      operationId: 'createMessage',
      body: createMessageSchema,
      response: {
        201: messageResponseSchema.describe('Message created successfully'),
        400: errorResponseSchema.describe('Invalid request body'),
        401: errorResponseSchema.describe('No authenticated session'),
        404: errorResponseSchema.describe('Conversation not found or not owned by the caller'),
        500: errorResponseSchema.describe('Internal server error'),
      },
    },
    // Owner-scoped: the target conversation must belong to the session user.
    preHandler: requireUser,
    handler: messageController.create,
  });

  app.get('/:messageId', {
    schema: {
      description: 'Retrieve one of the caller’s own messages by ID',
      summary: 'Get message by ID',
      tags: ['Messages'],
      operationId: 'getMessage',
      params: getMessagesSchema,
      response: {
        200: messageResponseSchema.describe('Message retrieved successfully'),
        400: errorResponseSchema.describe('Invalid message ID format'),
        401: errorResponseSchema.describe('No authenticated session'),
        404: errorResponseSchema.describe('Message not found or not owned by the caller'),
        500: errorResponseSchema.describe('Internal server error'),
      },
    },
    // Owner-scoped: another user's message reads as 404, never 403 (no leak).
    preHandler: requireUser,
    handler: messageController.get,
  });

  app.get('', {
    schema: {
      description: 'Retrieve all messages across the caller’s own conversations',
      summary: 'List messages',
      tags: ['Messages'],
      operationId: 'listMessages',
      response: {
        200: messagesArraySchema.describe('List of messages owned by the caller'),
        401: errorResponseSchema.describe('No authenticated session'),
        500: errorResponseSchema.describe('Internal server error'),
      },
    },
    // Owner-scoped: only messages in the session user's conversations are listed.
    preHandler: requireUser,
    handler: messageController.getAll,
  });
};

export default messageRoutes;
