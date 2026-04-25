import type { FastifyPluginAsync } from 'fastify';
import { validate } from '@backend/middleware/validate';
import { chatController } from '@backend/modules/chat/chat.controller';
import { cacheCheckHook } from '@backend/modules/chat/chat.cacheCheck.hook';
import { streamCaptureHook } from '@backend/modules/chat/chat.streamCapture.hook';
import { createChatStreamSchema } from '@backend/modules/chat/chat.validation';

const chatRoutes: FastifyPluginAsync = async (app) => {
  app.post('/stream', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
    preValidation: validate({ body: createChatStreamSchema }),
    preHandler: [cacheCheckHook, streamCaptureHook],
    handler: chatController.streamMessage,
  });
};

export default chatRoutes;
