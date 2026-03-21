import { validate } from '@backend/middleware/validate';
import { messageController } from '@backend/modules/message/message.controller';
import { Router } from 'express';
import {
  createMessageSchema,
  getMessagesSchema,
} from '@backend/modules/message/message.validation';

const messageRoutes: Router = Router();

messageRoutes.post('/', validate({ body: createMessageSchema }), messageController.create);
messageRoutes.get('/:messageId', validate({ params: getMessagesSchema }), messageController.get);
messageRoutes.get('/', messageController.getAll);

export { messageRoutes };
