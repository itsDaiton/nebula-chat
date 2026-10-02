import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { z } from 'zod';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { cacheCheckHook } from '@backend/modules/chat/chat.cacheCheck.hook';
import { chatController } from '@backend/modules/chat/chat.controller';
import { messageAllowanceHook } from '@backend/modules/chat/chat.messageAllowance.hook';
import { streamCaptureHook } from '@backend/modules/chat/chat.streamCapture.hook';
import { createChatStreamSchema } from '@backend/modules/chat/chat.validation';
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
  done();
};

export default chatRoutes;
