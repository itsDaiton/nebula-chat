import { env } from '@backend/env';
import { logger } from '@backend/logger';
import { buildApp } from '@backend/app';

const start = async (): Promise<void> => {
  const app = await buildApp();
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
