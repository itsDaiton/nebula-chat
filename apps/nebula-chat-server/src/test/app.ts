import type { FastifyInstance } from 'fastify';
import type { Logger } from '@nebula-chat/otel';

type CreateTestAppOptions = {
  /**
   * The logger the app is built with. Log-capture tests pass one from
   * `captureLogger()` to assert on the lines a request writes; everything else
   * gets the shared logger at the `LOG_LEVEL=fatal` `src/test/setup.ts` sets.
   */
  logger?: Logger;
};

/**
 * Builds the real Fastify app for `inject()`-based route tests.
 *
 * Callers must `vi.mock('@backend/db', ...)` and the repositories they exercise:
 * these are unit tests, so nothing reaches Postgres or Redis. `@backend/db` in
 * particular owns a module-level `pg` Pool whose `end()` throws if called twice,
 * so a real one cannot survive more than one app lifecycle per worker.
 */
export const createTestApp = async (
  options: CreateTestAppOptions = {},
): Promise<FastifyInstance> => {
  const { buildApp } = await import('@backend/app');
  const app = await buildApp(options.logger ? { logger: options.logger } : {});
  await app.ready();
  return app;
};
