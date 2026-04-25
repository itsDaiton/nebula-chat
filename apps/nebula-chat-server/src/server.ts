import { env } from '@backend/env';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import underPressure from '@fastify/under-pressure';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { corsOptions } from '@backend/config/cors.config';
import { errorHandler } from '@backend/errors/error.handler';
import { onCloseHook } from '@backend/hooks/onClose.hook';
import { logger } from '@backend/logger';
import cacheRoutes from '@backend/cache/cache.routes';
import chatRoutes from '@backend/modules/chat/chat.routes';
import conversationRoutes from '@backend/modules/conversation/conversation.routes';
import messageRoutes from '@backend/modules/message/message.routes';
import { openApiDocument } from '@backend/openapi';
import { resolveTrustProxy } from '@backend/utils/trustProxy';

export const buildApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : true,
    trustProxy: resolveTrustProxy(),
  });

  await app.register(sensible);

  await app.register(cors, corsOptions);

  await app.register(rateLimit, { global: false });

  await app.register(swagger, {
    mode: 'static',
    specification: { document: openApiDocument as never },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  await app.register(underPressure, {
    maxEventLoopDelay: 1000,
    healthCheckInterval: 5000,
  });

  app.get('/', async () => ({ message: 'Welcome to the Nebula Chat API' }));
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));
  app.get('/openapi.json', async () => openApiDocument);

  await app.register(chatRoutes, { prefix: '/api/chat' });
  await app.register(conversationRoutes, { prefix: '/api/conversations' });
  await app.register(messageRoutes, { prefix: '/api/messages' });
  await app.register(cacheRoutes, { prefix: '/api/cache' });

  app.setErrorHandler(errorHandler);

  app.addHook('onClose', onCloseHook);

  return app;
};

const start = async (): Promise<void> => {
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });

  const shutdown = (): void => {
    app.close().catch((err: unknown) => {
      app.log.error(err, 'Error during shutdown');
      process.exit(1);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

start().catch((err: unknown) => {
  logger.error(err, 'Failed to start server');
  process.exit(1);
});
