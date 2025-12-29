import type express from 'express';
import type { Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from '@backend/openapi';
import { authRoutes } from '@backend/modules/auth/auth.routes';
import { chatRoutes } from '@backend/modules/chat/chat.routes';
import { conversationRoutes } from '@backend/modules/conversation/conversation.routes';
import { messageRoutes } from '@backend/modules/message/message.routes';
import { cacheRoutes } from '@backend/cache/cache.routes';
import { requireAuth } from '@backend/middleware/requireAuth';

export const registerRoutes = (app: express.Express) => {
  // Root route
  app.get('/', (_req: Request, res: Response) => {
    res.json({ message: 'Welcome to the Nebula Chat API' });
  });
  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });
  // Swagger UI Docs
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  // OpenAPI JSON
  app.get('/openapi.json', (_req: Request, res: Response) => {
    res.json(openApiDocument);
  });
  // Authentication
  app.use('/api/auth', authRoutes);

  // Protected routes
  app.use('/api/chat', requireAuth, chatRoutes);
  app.use('/api/conversations', requireAuth, conversationRoutes);
  app.use('/api/messages', requireAuth, messageRoutes);
  app.use('/api/cache', requireAuth, cacheRoutes);
};
