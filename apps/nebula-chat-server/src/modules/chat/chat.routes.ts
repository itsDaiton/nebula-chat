import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { errorResponseSchema } from '@backend/errors/error.schema';
import { cacheCheckHook } from '@backend/modules/chat/chat.cacheCheck.hook';
import { chatController } from '@backend/modules/chat/chat.controller';
import { streamCaptureHook } from '@backend/modules/chat/chat.streamCapture.hook';
import { createChatStreamSchema } from '@backend/modules/chat/chat.validation';

const chatRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post('/stream', {
    schema: {
      description:
        'Stream a chat completion response from an AI model with automatic conversation and message persistence.',
      summary: 'Stream chat completion',
      tags: ['Chat'],
      operationId: 'streamChat',
      body: createChatStreamSchema,
      response: {
        400: errorResponseSchema,
        404: errorResponseSchema,
        413: errorResponseSchema,
        429: errorResponseSchema,
        500: errorResponseSchema,
      },
    },
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
    preHandler: [cacheCheckHook, streamCaptureHook],
    handler: chatController.streamMessage,
  });
};

export default chatRoutes;
