import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { chatController } from '@backend/modules/chat/chat.controller';
import { messageAllowanceHook } from '@backend/modules/chat/chat.messageAllowance.hook';
import {
  messageAllowanceSchema,
  sendMessageParamsSchema,
  sendMessageSchema,
  sentMessageSchema,
} from '@backend/modules/chat/chat.validation';
import { requireAuthentication } from '@backend/plugins/authGate.plugin';
import { jsonResponse } from '@backend/utils/jsonResponse';

// Mounted at `/api`: sending lives under the Session it goes to (ADR-0014).
const chatRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.post('/sessions/:sessionId/messages', {
    schema: {
      description:
        'Send a user Message to one of the caller’s own Sessions. The Message is persisted and its reply is queued; nothing waits on the model. Read the reply as server-sent events from `GET /api/streams/{streamId}`.',
      summary: 'Send message',
      tags: ['Chat'],
      operationId: 'sendMessage',
      params: sendMessageParamsSchema,
      body: sendMessageSchema,
      response: {
        202: jsonResponse('Message persisted and its reply queued', sentMessageSchema),
        400: jsonResponse('Invalid request body or session ID', errorEnvelopeSchema),
        401: jsonResponse('No auth session', errorEnvelopeSchema),
        403: jsonResponse(
          'Guest message allowance reached — registration required',
          errorEnvelopeSchema,
        ),
        404: jsonResponse('Session not found or not owned by the caller', errorEnvelopeSchema),
        413: jsonResponse('Message exceeds the prompt token limit', errorEnvelopeSchema),
        429: jsonResponse('Rate limit exceeded', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
    // Authenticate, then reject a capped Guest before anything is persisted (ADR-0010 §4).
    preHandler: [requireAuthentication, messageAllowanceHook],
    handler: chatController.sendMessage,
  });

  // A plain read: no rate-limit override, and not the allowance hook —
  // it reports the allowance, it never spends it.
  app.get('/chat/message-allowance', {
    schema: {
      description:
        "How much of the caller's message allowance is left. Metered users (Guests and unverified Registered users) get their limit, live count and remaining sends; verified Registered users get `metered: false`.",
      summary: 'Get message allowance',
      tags: ['Chat'],
      operationId: 'getMessageAllowance',
      response: {
        200: jsonResponse("The caller's message allowance", messageAllowanceSchema),
        401: jsonResponse('No auth session', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    preHandler: [requireAuthentication],
    handler: chatController.getMessageAllowance,
  });
  done();
};

export default chatRoutes;
