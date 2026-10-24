import { readFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { resolve } from 'node:path';
import { createLogger } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';
import { env } from '@server/env';

// Same cwd-relative read `src/app.ts` uses for the OpenAPI version: the server
// always runs from its package directory.
const { version } = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  version: string;
};

/** The server's `service.name`: on every line, and what level changes target. */
export const SERVICE_NAME = 'nebula-chat-server';

/** Names this process in log level reports: each Render instance has its own hostname. */
export const INSTANCE_ID = `${hostname()}:${process.pid}`;

/**
 * The server's single Pino instance, shared by `buildApp`, `app.log` and every `req.log` (ADR-0007).
 * Import it only where no `req.log` is in scope: startup, shutdown, Redis, Postgres and better-auth.
 */
export const logger: Logger = createLogger({
  serviceName: SERVICE_NAME,
  serviceVersion: version,
  environment: env.NODE_ENV,
  level: env.LOG_LEVEL,
  levelOverrides: env.LOG_LEVEL_OVERRIDES,
  pretty: env.NODE_ENV === 'development',
});
