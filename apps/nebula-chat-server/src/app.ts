import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import underPressure from '@fastify/under-pressure';
import Fastify from 'fastify';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import type { Logger } from '@nebula-chat/otel';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { z } from 'zod';
import { corsOptions } from '@backend/config/cors.config';
import { env } from '@backend/env';
import { errorHandler } from '@backend/errors/error.handler';
import { logger } from '@backend/logger';
import chatRoutes from '@backend/modules/chat/chat.routes';
import conversationRoutes from '@backend/modules/conversation/conversation.routes';
import messageRoutes from '@backend/modules/message/message.routes';
import { resolveTrustProxy } from '@backend/utils/trustProxy';

const { version } = JSON.parse(
  readFileSync(resolve(process.cwd(), '../../openapi/package.json'), 'utf8'),
) as { version: string };

export type BuildAppOptions = {
  /**
   * Logger the Fastify instance is built with. `src/server.ts` passes the same
   * instance it hands to `initTelemetry`, so the process runs one Pino logger.
   */
  logger?: Logger;
};

export const buildApp = async (options?: BuildAppOptions): Promise<FastifyInstance> => {
  // Widened to FastifyBaseLogger deliberately: Fastify infers its logger generic
  // from this value, and letting the concrete Pino type through would specialise
  // the instance past the plain `FastifyInstance` this factory returns.
  const loggerInstance: FastifyBaseLogger = options?.logger ?? logger;

  const app = Fastify({
    // Fastify owns request/response logging, reqId generation, the req/res
    // serializers, and the per-request req.log child logger. Do not layer a
    // pino-http hook on top of this — see ADR-0007.
    //
    // `loggerInstance`, not `logger`: since Fastify v5 the `logger` option takes
    // a boolean or a Pino *config*, and an already-constructed instance goes to
    // `loggerInstance`. Passing one to `logger` falls through to the http2
    // overload and misreports itself as a dozen unrelated type errors.
    loggerInstance,
    trustProxy: resolveTrustProxy(),
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(import('./plugins/db.plugin'));
  await app.register(import('./plugins/redis.plugin'));
  await app.register(import('./plugins/authGate.plugin'));
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
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'better-auth.session_token',
          },
        },
      },
      security: [{ cookieAuth: [] }],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, { routePrefix: '/docs' });

  await app.register(underPressure, {
    maxEventLoopDelay: 1000,
    healthCheckInterval: 5000,
  });

  app.get(
    '/',
    {
      schema: {
        summary: 'API root',
        description: 'Welcome endpoint — confirms the API is reachable.',
        tags: ['Health'],
        operationId: 'getApiRoot',
        response: {
          200: z.object({ message: z.string() }).describe('API is reachable'),
        },
      },
    },
    async () => ({ message: 'Welcome to the Nebula Chat API' }),
  );

  app.get(
    '/health',
    {
      schema: {
        summary: 'Health check',
        description: 'Returns server liveness status and current UTC timestamp.',
        tags: ['Health'],
        operationId: 'getHealth',
        response: {
          200: z
            .object({ status: z.literal('ok'), timestamp: z.string() })
            .describe('Server is healthy'),
        },
      },
    },
    async () => ({ status: 'ok' as const, timestamp: new Date().toISOString() }),
  );

  app.get('/openapi.json', { schema: { hide: true } }, async () => app.swagger());

  app.setErrorHandler(errorHandler);

  await app.register(chatRoutes, { prefix: '/api/chat' });
  await app.register(conversationRoutes, { prefix: '/api/conversations' });
  await app.register(messageRoutes, { prefix: '/api/messages' });

  return app;
};
