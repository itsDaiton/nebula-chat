import type { FastifyPluginAsync } from 'fastify';
import { validate } from '@backend/middleware/validate';
import { conversationController } from '@backend/modules/conversation/conversation.controller';
import {
  createConversationSchema,
  getConversationSchema,
  getConversationsQuerySchema,
  searchConversationsQuerySchema,
} from '@backend/modules/conversation/conversation.validation';

const conversationRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', {
    preValidation: validate({ body: createConversationSchema }),
    handler: conversationController.create,
  });

  app.get('/search', {
    preValidation: validate({ query: searchConversationsQuerySchema }),
    handler: conversationController.search,
  });

  app.get('/:conversationId', {
    preValidation: validate({ params: getConversationSchema }),
    handler: conversationController.get,
  });

  app.get('/', {
    preValidation: validate({ query: getConversationsQuerySchema }),
    handler: conversationController.getAll,
  });
};

export default conversationRoutes;
