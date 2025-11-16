import { sendMessageStream } from '@backend/controllers/chat.controller';
import { Router } from 'express';

const chatRoutes = Router();

chatRoutes.post('/message', sendMessageStream);

export { chatRoutes };
