import { initTelemetry, logEvent } from '@nebula-chat/otel';
import { env } from '@backend/env';
import { logger } from '@backend/logger';

initTelemetry('nebula-chat-server', { logger, diagLevel: env.OTEL_LOG_LEVEL });

import { buildApp } from '@backend/app';

const start = async (): Promise<void> => {
  const app = await buildApp({ logger });

  // `app.listen()` writes Fastify's own "Server listening at …" line through
  // `app.log`, and no option turns it off (`listenTextResolver` only rewords
  // it). `app.log` is a plain property that only instance-level code reads —
  // request loggers are children of the logger Fastify captured at
  // construction — so pointing it at a silent child for the duration of the
  // call drops that one line and nothing else. `server.started` replaces it.
  const instanceLog = app.log;
  app.log = instanceLog.child({}, { level: 'silent' });
  let address: string;
  try {
    address = await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } finally {
    app.log = instanceLog;
  }
  logEvent(
    logger,
    'info',
    'server.started',
    { 'server.address': new URL(address).hostname, 'server.port': env.PORT },
    `Server listening at ${address}`,
  );

  const shutdown = (): void => {
    app.close().catch((err: unknown) => {
      logEvent(logger, 'error', 'server.shutdown.failed', { err }, 'Error during shutdown');
      process.exit(1);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

start().catch((err: unknown) => {
  logEvent(logger, 'fatal', 'server.start.failed', { err }, 'Failed to start server');
  process.exit(1);
});
