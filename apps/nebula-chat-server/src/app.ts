import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import underPressure from '@fastify/under-pressure';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { corsOptions } from '@backend/config/cors.config';
import { env } from '@backend/env';
import { errorHandler } from '@backend/errors/error.handler';
import { onCloseHook } from '@backend/hooks/onClose.hook';
import cacheRoutes from '@backend/cache/cache.routes';
import chatRoutes from '@backend/modules/chat/chat.routes';
import conversationRoutes from '@backend/modules/conversation/conversation.routes';
import messageRoutes from '@backend/modules/message/message.routes';
import { resolveTrustProxy } from '@backend/utils/trustProxy';

const { version } = JSON.parse(
  readFileSync(resolve(process.cwd(), '../../openapi/package.json'), 'utf8'),
) as { version: string };

export const buildApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : true,
    trustProxy: resolveTrustProxy(),
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(sensible);
  await app.register(cors, corsOptions);
  await app.register(rateLimit, { global: false });

  await app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Nebula Chat API',
        version,
        description: 'REST API for Nebula Chat',
        contact: { name: 'Nebula Chat' },
      },
      servers: [{ url: env.SERVER_URL ?? '/' }],
      tags: [
        { name: 'Health', description: 'Liveness and readiness probes' },
        { name: 'Chat', description: 'Chat streaming endpoints' },
        { name: 'Conversations', description: 'Conversation management' },
        { name: 'Messages', description: 'Message management' },
        { name: 'Cache', description: 'Cache inspection and management' },
      ],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, { routePrefix: '/docs' });

  await app.register(underPressure, {
    maxEventLoopDelay: 1000,
    healthCheckInterval: 5000,
  });

  app.get('/', {
    schema: {
      summary: 'API root',
      description: 'Welcome endpoint — confirms the API is reachable.',
      tags: ['Health'],
      response: {
        200: z.object({ message: z.string() }).describe('API is reachable'),
      },
    },
  }, async () => ({ message: 'Welcome to the Nebula Chat API' }));

  app.get('/health', {
    schema: {
      summary: 'Health check',
      description: 'Returns server liveness status and current UTC timestamp.',
      tags: ['Health'],
      response: {
        200: z.object({ status: z.literal('ok'), timestamp: z.string() }).describe('Server is healthy'),
      },
    },
  }, async () => ({ status: 'ok' as const, timestamp: new Date().toISOString() }));

  app.get('/openapi.json', { schema: { hide: true } }, async () => app.swagger());

  await app.register(chatRoutes, { prefix: '/api/chat' });
  await app.register(conversationRoutes, { prefix: '/api/conversations' });
  await app.register(messageRoutes, { prefix: '/api/messages' });
  await app.register(cacheRoutes, { prefix: '/api/cache' });

  app.setErrorHandler(errorHandler);
  app.addHook('onClose', onCloseHook);

  return app;
};
