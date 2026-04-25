# M-7 — Background Jobs (BullMQ)

## Ticket metadata

| Field          | Value                                                 |
| -------------- | ----------------------------------------------------- |
| **ID**         | M-7                                                   |
| **Scope**      | `apps/server` only                                    |
| **Depends on** | M-1 (Fastify), M-3 (LangChain lib recommended)        |
| **Blocks**     | Nothing                                               |
| **Standalone** | Partial — works without M-3 using direct OpenAI calls |

## Objective

Move long-running LLM calls off the HTTP request thread into a BullMQ job queue. A client submits a message, receives a job ID immediately, and is notified via WebSocket (M-8) when the response is ready.

## Acceptance criteria

- [ ] `bullmq` and `@bull-board/fastify` installed
- [ ] `llmQueue` defined in `apps/server/src/workers/queues.ts`
- [ ] Worker process runs in `apps/server/src/workers/llm.worker.ts`
- [ ] `POST /api/chat/async` enqueues a job and returns `{ jobId }`
- [ ] `GET /api/chat/jobs/:jobId` returns job status and result
- [ ] BullMQ dashboard accessible at `/admin/queues` (dev only or behind auth)
- [ ] Worker retries failed jobs 3 times with exponential backoff
- [ ] `pnpm dev:worker` starts the worker process

## Packages to add to `apps/server/package.json`

```json
{
  "dependencies": {
    "bullmq": "^5.0.0",
    "@bull-board/fastify": "^6.0.0",
    "@bull-board/api": "^6.0.0"
  }
}
```

Add script:

```json
{
  "scripts": {
    "dev:worker": "tsx watch src/workers/llm.worker.ts"
  }
}
```

## Implementation

### File: `apps/server/src/workers/queues.ts`

```ts
import { Queue } from 'bullmq';
import { env } from '../env';

const connection = { url: env.REDIS_URL };

export const llmQueue = new Queue('llm-jobs', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export interface LLMJobData {
  conversationId: string;
  userId: string;
  messages: Array<{ role: string; content: string }>;
  model: string;
}

export interface LLMJobResult {
  conversationId: string;
  response: string;
  tokenCount?: number;
}
```

### File: `apps/server/src/workers/llm.worker.ts`

```ts
import '../env'; // validate env first
import { Worker } from 'bullmq';
import { buildChatChain } from '@nebula-chat/langchain';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { env } from '../env';
import type { LLMJobData, LLMJobResult } from './queues';

const worker = new Worker<LLMJobData, LLMJobResult>(
  'llm-jobs',
  async (job) => {
    const { conversationId, messages, model } = job.data;

    const chain = buildChatChain({ apiKey: env.OPENAI_API_KEY, model });

    const history = messages
      .slice(0, -1)
      .map((m) => (m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)));
    const input = messages.at(-1)!.content;

    const response = await chain.invoke({ history, input });

    return { conversationId, response };
  },
  {
    connection: { url: env.REDIS_URL },
    concurrency: 5,
  },
);

worker.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed for conversation ${result.conversationId}`);
  // TODO: emit WebSocket event to notify client (M-8)
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

process.on('SIGTERM', async () => {
  await worker.close();
});
```

### BullMQ dashboard plugin

```ts
// apps/server/src/plugins/bull-board.plugin.ts
import fp from 'fastify-plugin';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { llmQueue } from '../workers/queues';

export default fp(async (app) => {
  const serverAdapter = new FastifyAdapter();
  createBullBoard({
    queues: [new BullMQAdapter(llmQueue)],
    serverAdapter,
  });
  serverAdapter.setBasePath('/admin/queues');
  await app.register(serverAdapter.registerPlugin(), { prefix: '/admin/queues' });
});
```

---

---
