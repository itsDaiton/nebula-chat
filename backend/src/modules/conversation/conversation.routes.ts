import { conversationController } from '@backend/modules/conversation/conversation.controller';
import { Router } from 'express';

const conversationRoutes = Router();

conversationRoutes.post('/', conversationController.create);
conversationRoutes.get('/', conversationController.getAll);
conversationRoutes.get('/:conversationId', conversationController.get);

export { conversationRoutes };
