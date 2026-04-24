import type { FastifyPluginAsync } from 'fastify';
import { validate } from '@backend/middleware/validate';
import { messageController } from '@backend/modules/message/message.controller';
import {
  createMessageSchema,
  getMessagesSchema,
} from '@backend/modules/message/message.validation';

const messageRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', {
    preValidation: validate({ body: createMessageSchema }),
    handler: messageController.create,
  });

  app.get('/:messageId', {
    preValidation: validate({ params: getMessagesSchema }),
    handler: messageController.get,
  });

  app.get('/', { handler: messageController.getAll });
};

export default messageRoutes;
