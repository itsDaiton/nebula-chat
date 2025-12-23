import { validate } from '@backend/middleware/validate';
import { conversationController } from '@backend/modules/conversation/conversation.controller';
import { Router } from 'express';
import {
  createConversationSchema,
  getConversationSchema,
  getConversationsQuerySchema,
} from './conversation.validation';

const conversationRoutes = Router();

conversationRoutes.post(
  '/',
  validate({ body: createConversationSchema }),
  conversationController.create,
);
conversationRoutes.get(
  '/:conversationId',
  validate({ params: getConversationSchema }),
  conversationController.get,
);
conversationRoutes.get(
  '/',
  validate({ query: getConversationsQuerySchema }),
  conversationController.getAll,
);

export { conversationRoutes };
