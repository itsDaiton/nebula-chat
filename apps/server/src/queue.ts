import { Queue } from 'bullmq';
import type { JobsOptions } from 'bullmq';
import {
  CLARIFYING_QUESTION_TIMEOUT_QUEUE,
  clarifyingQuestionTimeoutJobId,
  DIRECT_REPLY_QUEUE,
  directReplyJobSchema,
  RUN_QUEUE,
  runJobSchema,
} from '@nebula-chat/contracts';
import type { DirectReplyJob, RunJob } from '@nebula-chat/contracts';
import { injectTraceContext, logEvent, SpanKind, withSpan } from '@nebula-chat/otel';
import type { EventLogger } from '@nebula-chat/otel';
import { env } from '@server/env';
import { redis } from '@server/redis';

// A cold start on Render's free plan takes up to a minute; the ping only has to start it.
const WORKER_PING_TIMEOUT_MS = 90_000;

const queues = new Map<string, Queue>();

// Built on first use: BullMQ connects as soon as a Queue exists, and nothing that only
// builds the app (the OpenAPI script, route tests) should open a Redis connection.
const queue = (name: string): Queue => {
  let existing = queues.get(name);
  if (!existing) {
    existing = new Queue(name, {
      connection: redis.dedicatedConnection(),
      // Finished jobs are only bookkeeping: the reply is in Postgres and on its stream.
      defaultJobOptions: { removeOnComplete: 1_000, removeOnFail: 1_000 },
    });
    queues.set(name, existing);
  }
  return existing;
};

// The enqueue is a producer span whose context rides in the payload.
const publish = async (
  name: string,
  jobName: string,
  payload: object,
  options?: JobsOptions,
): Promise<void> => {
  await withSpan(
    `${name} publish`,
    {
      kind: SpanKind.PRODUCER,
      attributes: {
        'messaging.system': 'bullmq',
        'messaging.destination.name': name,
        'messaging.operation.type': 'publish',
      },
    },
    () => {
      const data = { ...payload, ...injectTraceContext() };
      return options ? queue(name).add(jobName, data, options) : queue(name).add(jobName, data);
    },
  );
};

// Wakes a sleeping free-plan worker (ADR-0013). Never rejects: a failed ping is only logged,
// since the job waits in the queue either way.
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

/** Puts a Direct reply on the queue (payload checked against the contract), then pings the worker. */
export const enqueueDirectReply = async (
  job: DirectReplyJob,
  logger: EventLogger<'warn'>,
): Promise<void> => {
  await publish(DIRECT_REPLY_QUEUE, 'direct-reply', directReplyJobSchema.parse(job));
  void pingWorker(logger);
};

/** Puts a Run on the queue (payload checked against the contract), then pings the worker. */
export const enqueueRun = async (job: RunJob, logger: EventLogger<'warn'>): Promise<void> => {
  await publish(RUN_QUEUE, 'run', runJobSchema.parse(job), {
    attempts: env.RUN_JOB_ATTEMPTS,
    backoff: { type: 'exponential', delay: env.RUN_JOB_BACKOFF_MS },
  });
  void pingWorker(logger);
};

// The job may already be active or gone, which means the wait has ended: nothing to remove or promote.
const timeoutJob = async (runId: string) =>
  queue(CLARIFYING_QUESTION_TIMEOUT_QUEUE).getJob(clarifyingQuestionTimeoutJobId(runId));

/** Drops a Run's timeout job once its answer has settled the wait. */
export const removeClarifyingQuestionTimeout = async (runId: string): Promise<void> => {
  try {
    await (await timeoutJob(runId))?.remove();
  } catch {
    // An active job finds the Run no longer waiting and does nothing.
  }
};

/** Makes a waiting Run's timeout job fire now, so the worker ends it `cancelled`; pings a sleeping worker. */
export const promoteClarifyingQuestionTimeout = async (
  runId: string,
  logger: EventLogger<'warn'>,
): Promise<void> => {
  try {
    await (await timeoutJob(runId))?.promote();
  } catch {
    // Not delayed any more: the wait has already ended.
  }
  void pingWorker(logger);
};

export const closeQueue = async (): Promise<void> => {
  await Promise.all([...queues.values()].map((q) => q.close()));
};
