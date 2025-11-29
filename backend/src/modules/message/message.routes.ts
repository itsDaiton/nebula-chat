import { messageController } from '@backend/modules/message/message.controller';
import { Router } from 'express';

const messageRoutes = Router();

messageRoutes.post('/', messageController.create);
messageRoutes.get('/:messageId', messageController.get);

export { messageRoutes };
