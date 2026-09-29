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
  fastifyZodOpenApiPlugin,
  fastifyZodOpenApiTransformers,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-zod-openapi';
import { corsOptions } from '@backend/config/cors.config';
import { errorHandler } from '@backend/errors/error.handler';
import { apiRootSchema, healthSchema } from '@backend/health.validation';
import { logger } from '@backend/logger';
import chatRoutes from '@backend/modules/chat/chat.routes';
import conversationRoutes from '@backend/modules/conversation/conversation.routes';
import messageRoutes from '@backend/modules/message/message.routes';
import authGate from '@backend/plugins/authGate.plugin';
import dbPlugin from '@backend/plugins/db.plugin';
import redisPlugin from '@backend/plugins/redis.plugin';
import requestLogging from '@backend/plugins/requestLogging.plugin';
import { logController } from '@backend/utils/logController';
import { resolveTrustProxy } from '@backend/utils/trustProxy';
import { jsonResponse } from '@backend/utils/jsonResponse';

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
    // Fastify owns request-id generation and the per-request req.log child
    // logger. Its own request/response lines are off (`logController`): the
    // requestLogging plugin writes one `http.request.completed` per request
    // instead (ADR-0017). Do not layer a pino-http hook on top of this — see
    // ADR-0007.
    //
    // `loggerInstance`, not `logger`: since Fastify v5 the `logger` option takes
    // a boolean or a Pino *config*, and an already-constructed instance goes to
    // `loggerInstance`. Passing one to `logger` falls through to the http2
    // overload and misreports itself as a dozen unrelated type errors.
    loggerInstance,
    logController,
    trustProxy: resolveTrustProxy(),
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // First, so its root-level hooks wrap every route registered after it.
  await app.register(requestLogging);

  await app.register(dbPlugin);
  await app.register(redisPlugin);
  await app.register(authGate);
  await app.register(sensible);
  await app.register(cors, corsOptions);
  await app.register(rateLimit, { global: false });

  // Before @fastify/swagger: it collects the schemas carrying `.meta({ id })`,
  // which the transformers below emit as named components.
  await app.register(fastifyZodOpenApiPlugin);
  await app.register(swagger, {
    openapi: {
      // zod-openapi renders 3.1 at minimum.
      openapi: '3.1.0',
      info: {
        title: 'Nebula Chat API',
        version,
        description: 'REST API for Nebula Chat',
        contact: { name: 'Nebula Chat' },
      },
      // Nothing reads it: the client sets its own base URL and /docs is same-origin.
      servers: [{ url: '/' }],
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
    ...fastifyZodOpenApiTransformers,
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
          200: jsonResponse('API is reachable', apiRootSchema),
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
          200: jsonResponse('Server is healthy', healthSchema),
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
