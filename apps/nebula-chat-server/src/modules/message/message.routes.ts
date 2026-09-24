import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { messageController } from '@backend/modules/message/message.controller';
import { requireAuthentication } from '@backend/plugins/authGate.plugin';
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
        400: errorEnvelopeSchema.describe('Invalid request body'),
        401: errorEnvelopeSchema.describe('No authenticated session'),
        404: errorEnvelopeSchema.describe('Conversation not found or not owned by the caller'),
        500: errorEnvelopeSchema.describe('Internal server error'),
      },
    },
    // Owner-scoped: the target conversation must belong to the session user.
    preHandler: requireAuthentication,
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
        400: errorEnvelopeSchema.describe('Invalid message ID format'),
        401: errorEnvelopeSchema.describe('No authenticated session'),
        404: errorEnvelopeSchema.describe('Message not found or not owned by the caller'),
        500: errorEnvelopeSchema.describe('Internal server error'),
      },
    },
    // Owner-scoped: another user's message reads as 404, never 403 (no leak).
    preHandler: requireAuthentication,
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
        401: errorEnvelopeSchema.describe('No authenticated session'),
        500: errorEnvelopeSchema.describe('Internal server error'),
      },
    },
    // Owner-scoped: only messages in the session user's conversations are listed.
    preHandler: requireAuthentication,
    handler: messageController.getAll,
  });
};

export default messageRoutes;
