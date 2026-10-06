import {
  initTelemetry,
  listenForLogLevelChanges,
  logEvent,
  shutdownTelemetry,
} from '@nebula-chat/otel';
import { env } from '@backend/env';
import { logger, SERVICE_NAME } from '@backend/logger';

initTelemetry(SERVICE_NAME, { logger, diagLevel: env.OTEL_LOG_LEVEL });

import { buildApp } from '@backend/app';
import { redis } from '@backend/redis';
import { createShutdown } from '@backend/shutdown';

const start = async (): Promise<void> => {
  // Open Redis while the app builds, so the first request does not race the connect.
  // Not awaited: a Redis that is down must not hold up boot.
  redis.connect().catch((err: unknown) => {
    logEvent(
      logger,
      'error',
      'redis.connect.failed',
      { err },
      'Could not connect to Redis; retrying in the background',
    );
  });

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

  const shutdown = createShutdown({
    logger,
    close: async () => {
      // Settle both before exiting, so a failed close still flushes the spans
      // that explain it. A failed flush is the SDK's to report (via its diag
      // logger), not a failed shutdown: observability never fails the service.
      const [closed] = await Promise.allSettled([app.close(), shutdownTelemetry()]);
      if (closed.status === 'rejected') throw closed.reason;
    },
    timeoutMs: env.SHUTDOWN_TIMEOUT_MS,
  });

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

start().catch((err: unknown) => {
  logEvent(logger, 'fatal', 'server.start.failed', { err }, 'Failed to start server');
  process.exit(1);
});
