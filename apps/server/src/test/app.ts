import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify';
import type { Logger } from '@nebula-chat/otel';

type CreateTestAppOptions = {
  /**
   * The logger the app is built with: log-capture tests pass `captureLogger()`'s, everything else gets the shared one.
   */
  logger?: Logger;
};

let nextAddress = 0;

// The rate limiters key on the client address and keep counters for the life of the app, so a request that names no
// address gets its own: tests exercise a limit by passing `remoteAddress` or `cf-connecting-ip` explicitly.
const withFreshAddresses = (app: FastifyInstance): FastifyInstance => {
  const inject = app.inject.bind(app) as (
    options: InjectOptions,
  ) => Promise<LightMyRequestResponse>;
  const wrapped = (options: InjectOptions | string) => {
    const base = typeof options === 'string' ? { url: options } : options;
    const n = nextAddress++;
    return inject({
      ...base,
      remoteAddress: base.remoteAddress ?? `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`,
    });
  };
  app.inject = wrapped as unknown as typeof app.inject;
  return app;
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
  return withFreshAddresses(app);
};
