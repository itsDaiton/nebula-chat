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
import { corsOptions } from '@server/config/cors.config';
import { errorHandler } from '@server/errors/error.handler';
import { apiRootSchema, healthSchema } from '@server/health.validation';
import { logger } from '@server/logger';
import adminRoutes from '@server/modules/admin/admin.routes';
import auditRoutes from '@server/modules/audit/audit.routes';
import chatRoutes from '@server/modules/chat/chat.routes';
import sessionRoutes from '@server/modules/session/session.routes';
import streamRoutes from '@server/modules/stream/stream.routes';
import logLevelRoutes from '@server/modules/logLevel/logLevel.routes';
import messageRoutes from '@server/modules/message/message.routes';
import modelRoutes from '@server/modules/models/models.routes';
import profileImageRoutes from '@server/modules/profileImage/profileImage.routes';
import authGate from '@server/plugins/authGate.plugin';
import dbPlugin from '@server/plugins/db.plugin';
import redisPlugin from '@server/plugins/redis.plugin';
import requestLogging from '@server/plugins/requestLogging.plugin';
import { logController } from '@server/utils/logController';
import { resolveTrustProxy } from '@server/utils/trustProxy';
import { jsonResponse } from '@server/utils/jsonResponse';

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
  // Widened to FastifyBaseLogger: Fastify infers its logger generic from this value, and the concrete Pino type would specialise the instance.
  const loggerInstance: FastifyBaseLogger = options?.logger ?? logger;

  const app = Fastify({
    // Fastify owns request ids and `req.log`; its own request lines are off (`logController`) in favour of `http.request.completed` (ADR-0017, ADR-0007).
    // `loggerInstance`, not `logger`: since Fastify v5 `logger` takes only a boolean or Pino config.
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
        { name: 'Chat', description: 'Sending Messages and the message allowance' },
        { name: 'Streams', description: 'Reply streams, relayed as server-sent events' },
        { name: 'Sessions', description: 'Session management' },
        { name: 'Messages', description: 'Message management' },
        { name: 'Models', description: 'The model catalog: Models, limits and prices' },
        { name: 'Profile image', description: "A Registered user's Profile image" },
        { name: 'Operator', description: 'Operations for whoever runs the deployment' },
        {
          name: 'Admin',
          description: 'The admin API, for Admins signed in with two-factor authentication',
        },
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'better-auth.session_token',
          },
          // OPERATOR_TOKEN, sent as `Authorization: Bearer <token>`.
          operatorToken: { type: 'http', scheme: 'bearer' },
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
    () => ({ message: 'Welcome to the Nebula Chat API' }),
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
    () => ({ status: 'ok' as const, timestamp: new Date().toISOString() }),
  );

  app.get('/openapi.json', { schema: { hide: true } }, () => app.swagger());

  app.setErrorHandler(errorHandler);

  await app.register(chatRoutes, { prefix: '/api' });
  await app.register(sessionRoutes, { prefix: '/api/sessions' });
  await app.register(messageRoutes, { prefix: '/api/messages' });
  await app.register(modelRoutes, { prefix: '/api/models' });
  await app.register(streamRoutes, { prefix: '/api/streams' });
  await app.register(profileImageRoutes, { prefix: '/api/profile-image' });
  await app.register(logLevelRoutes, { prefix: '/api/internal/log-level' });
  await app.register(adminRoutes, { prefix: '/api/internal/admins' });
  await app.register(auditRoutes, { prefix: '/api/admin/audit' });

  return app;
};
