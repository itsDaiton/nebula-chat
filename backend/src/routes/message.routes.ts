import { messageController } from '@backend/controllers/message.controller';
import { Router } from 'express';

const messageRoutes = Router();

messageRoutes.post('/', messageController.create);
messageRoutes.get('/:messageId', messageController.get);

export { messageRoutes };
