import { env } from '@backend/env';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import underPressure from '@fastify/under-pressure';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { closeRedisClient } from '@backend/cache/cache.client';
import { checkOrigin } from '@backend/config/cors.config';
import { AppError } from '@backend/errors/AppError';
import { Prisma, prisma } from '@backend/prisma';
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

  await app.register(cors, {
    origin: (origin, cb) => {
      cb(null, checkOrigin(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    maxAge: 86400,
  });

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

  app.setErrorHandler((err, _req, reply) => {
    reply.log.error(err);

    if (err instanceof AppError) {
      return reply.status(err.status).send({
        success: false,
        error: err.error,
        message: err.message,
      });
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      return reply.status(400).send({
        success: false,
        error: 'PrismaClientKnownRequestError',
        message: err.message,
      });
    }

    const status =
      typeof (err as { statusCode?: number }).statusCode === 'number'
        ? (err as { statusCode: number }).statusCode
        : typeof (err as { status?: number }).status === 'number'
          ? (err as { status: number }).status
          : 500;

    const error =
      (err as { error?: string }).error ?? (err as { name?: string }).name ?? 'InternalServerError';

    const message =
      typeof (err as { message?: unknown }).message === 'string'
        ? (err as { message: string }).message
        : 'An internal server error occurred';

    return reply.status(status).send({
      success: false,
      error,
      message,
    });
  });

  app.addHook('onClose', async () => {
    try {
      await closeRedisClient();
    } catch {
      // fail-open
    }
    try {
      await prisma.$disconnect();
    } catch {
      // fail-open
    }
  });

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
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});
