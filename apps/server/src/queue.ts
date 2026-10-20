import { Queue } from 'bullmq';
import { DIRECT_REPLY_QUEUE, directReplyJobSchema } from '@nebula-chat/contracts';
import type { DirectReplyJob } from '@nebula-chat/contracts';
import { logEvent } from '@nebula-chat/otel';
import type { EventLogger } from '@nebula-chat/otel';
import { env } from '@backend/env';
import { redis } from '@backend/redis';

// A cold start on Render's free plan takes up to a minute; the ping only has to start it.
const WORKER_PING_TIMEOUT_MS = 90_000;

let directReplies: Queue | undefined;

// Built on first use: BullMQ connects as soon as a Queue exists, and nothing that only
// builds the app (the OpenAPI script, route tests) should open a Redis connection.
const directReplyQueue = (): Queue => {
  directReplies ??= new Queue(DIRECT_REPLY_QUEUE, {
    connection: redis.dedicatedConnection(),
    // Finished jobs are only bookkeeping: the reply is in Postgres and on its stream.
    defaultJobOptions: { removeOnComplete: 1_000, removeOnFail: 1_000 },
  });
  return directReplies;
};

/**
 * Wakes the worker: Render's free web services sleep without inbound HTTP, and a
 * request is what starts one (ADR-0013). Never rejects. A failed ping is logged,
 * not surfaced, since the job waits in the queue either way.
 */
export const pingWorker = async (logger: EventLogger<'warn'>): Promise<void> => {
  try {
    const res = await fetch(new URL('/health', env.WORKER_URL), {
      signal: AbortSignal.timeout(WORKER_PING_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Worker /health answered ${res.status}`);
  } catch (err) {
    logEvent(
      logger,
      'warn',
      'worker.ping.failed',
      { err },
      'Worker ping failed; the job waits in the queue until a worker is up',
    );
  }
};

/** Puts a Direct reply on the queue (the payload is checked against the contract), then pings the worker. */
export const enqueueDirectReply = async (
  job: DirectReplyJob,
  logger: EventLogger<'warn'>,
): Promise<void> => {
  await directReplyQueue().add('direct-reply', directReplyJobSchema.parse(job));
  void pingWorker(logger);
};

export const closeQueue = async (): Promise<void> => {
  await directReplies?.close();
};
