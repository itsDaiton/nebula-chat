// Load order here is load-bearing and invisible — do not reorder, and do not let
// an import-sorting tool hoist anything past `initTelemetry`.
//
// OpenTelemetry auto-instrumentation patches `http`, `pg`, `redis` and friends as
// they are first required, so every module that touches them (`@backend/app` and
// its graph) must be imported *below* the `initTelemetry` call. `@backend/env` is
// the one exception, imported above it out of necessity: the SDK's diag logger is
// the server's single Pino instance, whose level and pretty-printing come from the
// validated env. `env.ts` pulls in only `dotenv` and Zod, neither of which is an
// instrumentation target, so nothing observable is lost by loading it first.
import { initTelemetry } from '@nebula-chat/otel';
import { env } from '@backend/env';
import { logger } from '@backend/logger';

initTelemetry('nebula-chat-server', { logger, diagLevel: env.OTEL_LOG_LEVEL });

import { buildApp } from '@backend/app';

const start = async (): Promise<void> => {
  const app = await buildApp({ logger });
  await app.listen({ port: env.PORT, host: '0.0.0.0' });

  const shutdown = (): void => {
    app.close().catch((err: unknown) => {
      app.log.error(err, 'Error during shutdown');
      process.exit(1);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

start().catch((err: unknown) => {
  logger.error(err, 'Failed to start server');
  process.exit(1);
});
