import type express from 'express';
import { chatRoutes } from '@backend/modules/chat/chat.routes';
import { conversationRoutes } from '@backend/modules/conversation/conversation.routes';
import { messageRoutes } from '@backend/modules/message/message.routes';
import { cacheRoutes } from './cache.routes';

export const registerRoutes = (app: express.Express) => {
  app.use('/api/chat', chatRoutes);
  app.use('/api/conversations', conversationRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/cache', cacheRoutes);
};
