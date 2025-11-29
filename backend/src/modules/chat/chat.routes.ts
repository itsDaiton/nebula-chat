import { sendMessageStream } from '@backend/modules/chat/chat.controller';
import { cacheCheck } from '@backend/middleware/cacheCheck';
import { rateLimiter } from '@backend/middleware/rateLimiter';
import { streamCapture } from '@backend/middleware/streamCapture';
import { validateChat } from '@backend/middleware/validateChat';
import { Router } from 'express';

const chatRoutes = Router();

chatRoutes.post('/stream', rateLimiter, validateChat, cacheCheck, streamCapture, sendMessageStream);

export { chatRoutes };
