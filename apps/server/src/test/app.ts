import type { FastifyInstance } from 'fastify';
import type { Logger } from '@nebula-chat/otel';

type CreateTestAppOptions = {
  /**
   * The logger the app is built with: log-capture tests pass `captureLogger()`'s, everything else gets the shared one.
   */
  logger?: Logger;
};

/**
 * Builds the real Fastify app for `inject()` route tests; callers `vi.mock('@server/db', ...)` and their repositories,
 * since the db module's `pg` Pool can't survive more than one app lifecycle per worker.
 */
export const createTestApp = async (
  options: CreateTestAppOptions = {},
): Promise<FastifyInstance> => {
  const { buildApp } = await import('@server/app.js');
  const app = await buildApp(options.logger ? { logger: options.logger } : {});
  await app.ready();
  return app;
};
