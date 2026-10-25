import {
  componentLogger,
  createShutdown,
  initTelemetry,
  listenForLogLevelChanges,
  logEvent,
  shutdownTelemetry,
} from '@nebula-chat/otel';
import { env } from '@worker/env';
import { INSTANCE_ID, logger, SERVICE_NAME } from '@worker/logger';

initTelemetry(SERVICE_NAME, { logger, diagLevel: env.OTEL_LOG_LEVEL });

import { createServer } from 'node:http';
import { Worker } from 'bullmq';
import { DIRECT_REPLY_QUEUE, serializeReplyStreamEvent } from '@nebula-chat/contracts';
import { streamChat } from '@nebula-chat/langchain';
import {
  REPLY_STREAM_RECORD_TTL_SECONDS,
  streamCancelKey,
  streamEndedKey,
  streamKey,
} from '@nebula-chat/redis';
import { closeDb } from '@worker/db';
import { directReplyRepository } from '@worker/directReplies/directReplyRepository';
import { createDirectReplyProcessor } from '@worker/jobs/directReply';
import { redis } from '@worker/redis';

const start = async (): Promise<void> => {
  const processDirectReply = createDirectReplyProcessor({
    store: directReplyRepository,
    stream: {
      append: async (streamId, event) => {
        await redis.streams.append(streamKey(streamId), serializeReplyStreamEvent(event));
      },
      expire: (streamId) => redis.streams.expire(streamKey(streamId), env.STREAM_TTL_SECONDS),
      isCancelled: (streamId) => redis.flags.isRaised(streamCancelKey(streamId)),
      markEnded: (streamId) =>
        redis.flags.raise(streamEndedKey(streamId), REPLY_STREAM_RECORD_TTL_SECONDS),
    },
    cache: redis.cache,
    streamChat,
    apiKeys: { openai: env.OPENAI_API_KEY, anthropic: env.ANTHROPIC_API_KEY },
    logger,
  });

  // BullMQ blocks on its connection, so it gets a dedicated one (maxRetriesPerRequest: null).
  const directReplies = new Worker(DIRECT_REPLY_QUEUE, processDirectReply, {
    connection: redis.dedicatedConnection(),
    concurrency: env.WORKER_CONCURRENCY,
  });
  directReplies.on('error', (err) => {
    // `warn`: the connection's own `redis.connection.failed` line is the outage's error.
    logEvent(
      componentLogger(logger, 'redis'),
      'warn',
      'job.queue.failed',
      { err },
      'Direct reply queue error',
    );
  });

  // Render's free plan has no background workers: the worker is a web service, and the
  // server's ping to /health on every enqueue is what wakes it (ADR-0013).
  const health = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((resolve) => health.listen(env.PORT, '0.0.0.0', resolve));
  logEvent(
    logger,
    'info',
    'worker.started',
    { 'server.port': env.PORT },
    `Worker consuming ${DIRECT_REPLY_QUEUE} · /health on :${env.PORT} (ready in ${process.uptime().toFixed(1)}s)`,
  );

  // Not awaited: it never rejects, and a Redis that is down must not hold up boot.
  void listenForLogLevelChanges({
    logger,
    pubsub: redis.pubsub,
    serviceName: SERVICE_NAME,
    instanceId: INSTANCE_ID,
  });

  const shutdown = createShutdown({
    logger,
    failedEvent: 'worker.shutdown.failed',
    // The worker finishes the replies in flight before Redis and Postgres go.
    close: async () => {
      await Promise.all([
        directReplies.close(),
        new Promise<void>((resolve) => health.close(() => resolve())),
      ]);
      await Promise.all([redis.close(), closeDb(), shutdownTelemetry()]);
    },
  });

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

start().catch((err: unknown) => {
  logEvent(logger, 'fatal', 'worker.start.failed', { err }, 'Failed to start worker');
  process.exit(1);
});
