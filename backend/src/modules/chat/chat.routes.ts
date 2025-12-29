import { cacheCheck } from '@backend/middleware/cacheCheck';
import { chatRateLimiter } from '@backend/middleware/rateLimiter';
import { streamCapture } from '@backend/middleware/streamCapture';
import { validate } from '@backend/middleware/validate';
import { Router } from 'express';
import { createChatStreamSchema } from './chat.validation';
import { chatController } from './chat.controller';

const chatRoutes = Router();

chatRoutes.post(
  '/stream',
  chatRateLimiter,
  validate({ body: createChatStreamSchema }),
  cacheCheck,
  streamCapture,
  chatController.streamMessage,
);

export { chatRoutes };
