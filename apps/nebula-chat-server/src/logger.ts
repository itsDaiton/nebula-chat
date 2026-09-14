import { createLogger } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';
import { env } from '@backend/env';

/**
 * The server's single Pino instance.
 *
 * `buildApp` builds Fastify with this same object, so `app.log` and every
 * per-request `req.log` child share it — one logger, one config, one
 * destination, one `pino-pretty` worker in development.
 *
 * Import it only where there is no `req.log` in scope: Redis connection events,
 * the SSE capture path after the reply is hijacked, startup failure handling.
 * Inside a request, always prefer `req.log` so lines carry the `reqId`.
 *
 * This is not a return of the M-1-era file that used to live at this path. That
 * one was a *second* Pino, with its own hardcoded config, competing with
 * Fastify's. This is the instance Fastify itself uses. See ADR-0007.
 */
export const logger: Logger = createLogger({
  level: env.LOG_LEVEL,
  pretty: env.NODE_ENV === 'development',
});
