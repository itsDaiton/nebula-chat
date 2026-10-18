import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { z } from 'zod';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { cacheCheckHook } from '@backend/modules/chat/chat.cacheCheck.hook';
import { chatController } from '@backend/modules/chat/chat.controller';
import { messageAllowanceHook } from '@backend/modules/chat/chat.messageAllowance.hook';
import { streamCaptureHook } from '@backend/modules/chat/chat.streamCapture.hook';
import {
  createChatStreamSchema,
  messageAllowanceSchema,
} from '@backend/modules/chat/chat.validation';
import { requireAuthentication } from '@backend/plugins/authGate.plugin';
import { jsonResponse } from '@backend/utils/jsonResponse';

const chatRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.post('/stream', {
    schema: {
      description:
        'Stream a chat completion response from an AI model with automatic conversation and message persistence.',
      summary: 'Stream chat completion',
      tags: ['Chat'],
      operationId: 'streamChat',
      body: createChatStreamSchema,
      response: {
        200: jsonResponse('Streamed SSE events', z.string()),
        400: jsonResponse('Invalid request body or validation error', errorEnvelopeSchema),
        404: jsonResponse('Conversation not found', errorEnvelopeSchema),
        401: jsonResponse('No authenticated session', errorEnvelopeSchema),
        403: jsonResponse(
          'Guest message allowance reached — registration required',
          errorEnvelopeSchema,
        ),
        413: jsonResponse('Message or context exceeds token limit', errorEnvelopeSchema),
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
    // Order matters: authenticate, then reject a capped Guest before any cache or
    // model work, then the cache-replay/capture hooks (ADR-0010 §4).
    preHandler: [requireAuthentication, messageAllowanceHook, cacheCheckHook, streamCaptureHook],
    handler: chatController.streamMessage,
  });

  // A plain read: no rate-limit override, and not the allowance or cache hooks —
  // it reports the allowance, it never spends it.
  app.get('/message-allowance', {
    schema: {
      description:
        "How much of the caller's message allowance is left. Metered users (Guests and unverified Registered users) get their limit, live count and remaining sends; verified Registered users get `metered: false`.",
      summary: 'Get message allowance',
      tags: ['Chat'],
      operationId: 'getMessageAllowance',
      response: {
        200: jsonResponse("The caller's message allowance", messageAllowanceSchema),
        401: jsonResponse('No authenticated session', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    preHandler: [requireAuthentication],
    handler: chatController.getMessageAllowance,
  });
  done();
};

export default chatRoutes;
