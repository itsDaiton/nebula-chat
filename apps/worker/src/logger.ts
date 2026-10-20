import { readFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { resolve } from 'node:path';
import { createLogger } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';
import { env } from '@worker/env';

// The worker always runs from its package directory, as the server does.
const { version } = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  version: string;
};

/** The worker's `service.name`: on every line, and what level changes target. */
export const SERVICE_NAME = 'nebula-chat-worker';

/** Names this process in log level reports. */
export const INSTANCE_ID = `${hostname()}:${process.pid}`;

/** The worker's single Pino instance; a job logs through a child bound to its IDs. */
export const logger: Logger = createLogger({
  serviceName: SERVICE_NAME,
  serviceVersion: version,
  environment: env.NODE_ENV,
  level: env.LOG_LEVEL,
  levelOverrides: env.LOG_LEVEL_OVERRIDES,
  pretty: env.NODE_ENV === 'development',
});
