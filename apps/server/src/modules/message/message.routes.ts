import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { messageController } from '@server/modules/message/message.controller';
import { requireAuthentication } from '@server/plugins/authGate.plugin';
import {
  createMessageSchema,
  getMessagesSchema,
  listMessagesQuerySchema,
  messageResponseSchema,
  messagesArraySchema,
} from '@server/modules/message/message.validation';
import { jsonResponse } from '@server/utils/jsonResponse';

const messageRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.post('', {
    schema: {
      description: 'Create a new message in one of the caller’s own sessions',
      summary: 'Create message',
      tags: ['Messages'],
      operationId: 'createMessage',
      body: createMessageSchema,
      response: {
        201: jsonResponse('Message created successfully', messageResponseSchema),
        400: jsonResponse('Invalid request body', errorEnvelopeSchema),
        401: jsonResponse('No auth session', errorEnvelopeSchema),
        404: jsonResponse('Session not found or not owned by the caller', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    // Owner-scoped: the target session must belong to the auth session's user.
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
        401: jsonResponse('No auth session', errorEnvelopeSchema),
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
        'Retrieve the messages across the caller’s own sessions, newest first. Pass `sessionId` to list one session’s messages, oldest first; a session the caller does not own lists as empty.',
      summary: 'List messages',
      tags: ['Messages'],
      operationId: 'listMessages',
      querystring: listMessagesQuerySchema,
      response: {
        200: jsonResponse('List of messages owned by the caller', messagesArraySchema),
        400: jsonResponse('Invalid session ID format', errorEnvelopeSchema),
        401: jsonResponse('No auth session', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    // Owner-scoped: only messages in the auth session's user's Sessions are listed,
    // and a `sessionId` filter narrows within them (ADR-0010 §2).
    preHandler: requireAuthentication,
    handler: messageController.getAll,
  });
  done();
};

export default messageRoutes;
