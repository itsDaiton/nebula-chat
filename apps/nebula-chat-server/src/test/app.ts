import type { FastifyInstance } from 'fastify';

/**
 * Builds the real Fastify app for `inject()`-based route tests.
 *
 * Callers must `vi.mock('@backend/db', ...)` and the repositories they exercise:
 * these are unit tests, so nothing reaches Postgres or Redis. `@backend/db` in
 * particular owns a module-level `pg` Pool whose `end()` throws if called twice,
 * so a real one cannot survive more than one app lifecycle per worker.
 */
export const createTestApp = async (): Promise<FastifyInstance> => {
  const { buildApp } = await import('@backend/app');
  const app = await buildApp();
  await app.ready();
  return app;
};
