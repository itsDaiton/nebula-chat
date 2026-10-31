import { MemorySaver } from '@langchain/langgraph';
import { beforeEach, describe, expect, it } from 'vitest';
import type { RunJob } from '@nebula-chat/contracts';
import { captureLogger } from '@nebula-chat/otel/testing';
import { createClarifyingQuestionTimeoutProcessor } from '@worker/jobs/clarifyingQuestionTimeout';
import type { WaitingRun, WaitingRunStore } from '@worker/runs/endClarifyingWait';

const RUN_ID = '55555555-5555-4555-8555-555555555555';
const IDS: WaitingRun = {
  userId: '11111111-1111-4111-8111-111111111111',
  sessionId: '22222222-2222-4222-8222-222222222222',
  messageId: '33333333-3333-4333-8333-333333333333',
};

let status: string;
let cancelled: boolean;
let enqueued: RunJob[];
let checkpointer: MemorySaver;
let deleted: string[];

const store: WaitingRunStore = {
  settleWaiting: async (_runId, next) => {
    if (status !== 'waiting') return null;
    status = next;
    return IDS;
  },
};

const fire = (data: unknown = { runId: RUN_ID }) =>
  createClarifyingQuestionTimeoutProcessor({
    runs: store,
    checkpointer,
    isCancelled: async () => cancelled,
    enqueueRun: async (job) => {
      enqueued.push(job);
    },
    logger: captureLogger().logger,
  })({ id: 'job-1', data });

beforeEach(() => {
  status = 'waiting';
  cancelled = false;
  enqueued = [];
  deleted = [];
  checkpointer = new MemorySaver();
  checkpointer.deleteThread = async (id) => {
    deleted.push(id);
  };
});

describe('the Clarifying question timeout job', () => {
  it('queues the Run and enqueues its resume without an answer', async () => {
    await fire();

    expect(status).toBe('queued');
    expect(enqueued).toEqual([
      { ...IDS, runId: RUN_ID, streamId: expect.any(String), resume: { answerMessageId: null } },
    ]);
  });

  it('ends a cancelled waiting Run `cancelled` and deletes its checkpoints', async () => {
    cancelled = true;

    await fire();

    expect(status).toBe('cancelled');
    expect(deleted).toEqual([RUN_ID]);
    expect(enqueued).toEqual([]);
  });

  it('does nothing when an answer settled the Run first', async () => {
    status = 'queued';

    await fire();

    expect(status).toBe('queued');
    expect(enqueued).toEqual([]);
    expect(deleted).toEqual([]);
  });

  it('settles once when fired twice', async () => {
    await fire();
    await fire();

    expect(enqueued).toHaveLength(1);
  });

  it('drops a payload that breaks the contract', async () => {
    await fire({ runId: 'nope' });

    expect(status).toBe('waiting');
    expect(enqueued).toEqual([]);
  });
});
