import { sendMessageStream } from '@backend/controllers/chat.controller';
import { cacheCheck } from '@backend/middlewares/cacheCheck';
import { rateLimiter } from '@backend/middlewares/rateLimiter';
import { streamCapture } from '@backend/middlewares/streamCapture';
import { validateChat } from '@backend/middlewares/validateChat';
import { Router } from 'express';

const chatRoutes = Router();

chatRoutes.post('/stream', rateLimiter, validateChat, cacheCheck, streamCapture, sendMessageStream);

export { chatRoutes };
