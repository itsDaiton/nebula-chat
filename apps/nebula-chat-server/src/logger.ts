import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createLogger } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';
import { env } from '@backend/env';

// Same cwd-relative read `src/app.ts` uses for the OpenAPI version: the server
// always runs from its package directory.
const { version } = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  version: string;
};

/**
 * The server's single Pino instance.
 *
 * `buildApp` builds Fastify with this same object, so `app.log` and every
 * per-request `req.log` child share it — one logger, one config, one
 * destination, one `pino-pretty` worker in development. Every line it writes
 * carries `service.name`, `service.version` and `deployment.environment.name`.
 *
 * Import it only where there is no `req.log` in scope: startup and shutdown,
 * the Redis toolkit and better-auth (both built at module load). Inside a
 * request, always prefer `req.log` so lines carry the request id and the User.
 *
 * This is not a return of the M-1-era file that used to live at this path. That
 * one was a *second* Pino, with its own hardcoded config, competing with
 * Fastify's. This is the instance Fastify itself uses. See ADR-0007.
 */
export const logger: Logger = createLogger({
  serviceName: 'nebula-chat-server',
  serviceVersion: version,
  environment: env.NODE_ENV,
  level: env.LOG_LEVEL,
  levelOverrides: env.LOG_LEVEL_OVERRIDES,
  pretty: env.NODE_ENV === 'development',
});
