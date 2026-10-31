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
import { DIRECT_REPLY_QUEUE, RUN_QUEUE, serializeReplyStreamEvent } from '@nebula-chat/contracts';
import {
  REPLY_STREAM_RECORD_TTL_SECONDS,
  streamCancelKey,
  streamEndedKey,
  streamKey,
} from '@nebula-chat/redis';
import { closeDb, pool } from '@worker/db';
import { directReplyRepository } from '@worker/directReplies/directReplyRepository';
import type { ReplyStreamWriter } from '@worker/directReplies/runDirectReply';
import { streamChat } from '@worker/directReplies/streamChat';
import { createDirectReplyProcessor } from '@worker/jobs/directReply';
import { createRunProcessor } from '@worker/jobs/run';
import { createLLM } from '@worker/llm/createLLM';
import { loadPrompts } from '@worker/llm/prompts';
import { invokeStructured } from '@worker/llm/structuredOutput';
import { modelCallRepository } from '@worker/modelCalls/modelCallRepository';
import { redis } from '@worker/redis';
import { createCheckpointer } from '@worker/runs/checkpointer';
import { runRepository } from '@worker/runs/runRepository';
import { stepRepository } from '@worker/runs/stepRepository';
import { dnsResolve, nodeRequest, webFetchTool } from '@worker/tools/webFetch';
import { webSearchTool } from '@worker/tools/webSearch';

const start = async (): Promise<void> => {
  const stream: ReplyStreamWriter = {
    append: async (streamId, event) => {
      await redis.streams.append(streamKey(streamId), serializeReplyStreamEvent(event));
    },
    expire: (streamId) => redis.streams.expire(streamKey(streamId), env.STREAM_TTL_SECONDS),
    isCancelled: (streamId) => redis.flags.isRaised(streamCancelKey(streamId)),
    markEnded: (streamId) =>
      redis.flags.raise(streamEndedKey(streamId), REPLY_STREAM_RECORD_TTL_SECONDS),
  };
  // A missing prompt fails boot here rather than the first reply that needs it.
  const prompts = loadPrompts();
  const apiKeys = { openai: env.OPENAI_API_KEY, anthropic: env.ANTHROPIC_API_KEY };

  const processDirectReply = createDirectReplyProcessor({
    store: directReplyRepository,
    stream,
    cache: redis.cache,
    ledger: modelCallRepository,
    streamChat,
    prompts,
    apiKeys,
    logger,
  });

  const processRun = createRunProcessor({
    runs: runRepository,
    steps: stepRepository,
    stream,
    ledger: modelCallRepository,
    // Creates or migrates the `langgraph` schema before the first Run needs it.
    checkpointer: await createCheckpointer(pool),
    models: { structured: (request) => invokeStructured(request), chat: createLLM },
    prompts,
    apiKeys,
    logger,
    toolbox: {
      web_search: webSearchTool({
        apiKey: env.TAVILY_API_KEY,
        fetch: globalThis.fetch,
        timeoutMs: env.WEB_FETCH_TIMEOUT_MS,
        maxResults: 5,
      }),
      web_fetch: webFetchTool({
        lookup: dnsResolve,
        request: nodeRequest,
        maxBytes: env.WEB_FETCH_MAX_BYTES,
        timeoutMs: env.WEB_FETCH_TIMEOUT_MS,
        maxRedirects: env.WEB_FETCH_MAX_REDIRECTS,
        maxChars: env.WEB_FETCH_MAX_CHARS,
      }),
    },
    limits: {
      turnCap: env.RUN_TURN_CAP,
      parallelDelegates: env.RUN_PARALLEL_DELEGATES,
      tokenBudget: env.RUN_TOKEN_BUDGET,
      handoffThreshold: env.RUN_HANDOFF_THRESHOLD,
      delegateTimeoutMs: env.RUN_DELEGATE_TIMEOUT_MS,
      delegateToolCallCap: env.RUN_DELEGATE_TOOL_CALL_CAP,
    },
    runTimeoutMs: env.RUN_TIMEOUT_MS,
  });

  // BullMQ blocks on its connection, so it gets a dedicated one (maxRetriesPerRequest: null).
  const directReplies = new Worker(DIRECT_REPLY_QUEUE, processDirectReply, {
    connection: redis.dedicatedConnection(),
    concurrency: env.WORKER_CONCURRENCY,
  });
  const runs = new Worker(RUN_QUEUE, processRun, {
    connection: redis.dedicatedConnection(),
    concurrency: env.RUN_CONCURRENCY,
  });
  for (const [queue, name] of [
    [directReplies, 'Direct reply'],
    [runs, 'Run'],
  ] as const) {
    queue.on('error', (err) => {
      // `warn`: the connection's own `redis.connection.failed` line is the outage's error.
      logEvent(
        componentLogger(logger, 'redis'),
        'warn',
        'job.queue.failed',
        { err },
        `${name} queue error`,
      );
    });
  }

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
    `Worker consuming ${DIRECT_REPLY_QUEUE} and ${RUN_QUEUE} · /health on :${env.PORT} (ready in ${process.uptime().toFixed(1)}s)`,
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
    // The worker finishes the replies and Runs in flight before Redis and Postgres go.
    close: async () => {
      await Promise.all([
        directReplies.close(),
        runs.close(),
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
