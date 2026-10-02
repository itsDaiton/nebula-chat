import { initTelemetry, listenForLogLevelChanges, logEvent } from '@nebula-chat/otel';
import { env } from '@backend/env';
import { logger, SERVICE_NAME } from '@backend/logger';

initTelemetry(SERVICE_NAME, { logger, diagLevel: env.OTEL_LOG_LEVEL });

import { buildApp } from '@backend/app';
import { redis } from '@backend/redis';

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

  // Not awaited: it never rejects, and a Redis that is down must not hold up boot.
  void listenForLogLevelChanges({ logger, pubsub: redis.pubsub, serviceName: SERVICE_NAME });

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
