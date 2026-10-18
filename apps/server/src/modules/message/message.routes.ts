import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { messageController } from '@backend/modules/message/message.controller';
import { requireAuthentication } from '@backend/plugins/authGate.plugin';
import {
  createMessageSchema,
  getMessagesSchema,
  listMessagesQuerySchema,
  messageResponseSchema,
  messagesArraySchema,
} from '@backend/modules/message/message.validation';
import { jsonResponse } from '@backend/utils/jsonResponse';

const messageRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.post('', {
    schema: {
      description: 'Create a new message in one of the caller’s own conversations',
      summary: 'Create message',
      tags: ['Messages'],
      operationId: 'createMessage',
      body: createMessageSchema,
      response: {
        201: jsonResponse('Message created successfully', messageResponseSchema),
        400: jsonResponse('Invalid request body', errorEnvelopeSchema),
        401: jsonResponse('No authenticated session', errorEnvelopeSchema),
        404: jsonResponse('Conversation not found or not owned by the caller', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
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
        200: jsonResponse('Message retrieved successfully', messageResponseSchema),
        400: jsonResponse('Invalid message ID format', errorEnvelopeSchema),
        401: jsonResponse('No authenticated session', errorEnvelopeSchema),
        404: jsonResponse('Message not found or not owned by the caller', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    // Owner-scoped: another user's message reads as 404, never 403 (no leak).
    preHandler: requireAuthentication,
    handler: messageController.get,
  });

  app.get('', {
    schema: {
      description:
        'Retrieve the messages across the caller’s own conversations, newest first. Pass `conversationId` to list one conversation’s messages, oldest first; a conversation the caller does not own lists as empty.',
      summary: 'List messages',
      tags: ['Messages'],
      operationId: 'listMessages',
      querystring: listMessagesQuerySchema,
      response: {
        200: jsonResponse('List of messages owned by the caller', messagesArraySchema),
        400: jsonResponse('Invalid conversation ID format', errorEnvelopeSchema),
        401: jsonResponse('No authenticated session', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    // Owner-scoped: only messages in the session user's conversations are listed,
    // and a `conversationId` filter narrows within them (ADR-0010 §2).
    preHandler: requireAuthentication,
    handler: messageController.getAll,
  });
  done();
};

export default messageRoutes;
