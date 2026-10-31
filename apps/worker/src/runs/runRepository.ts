import { and, desc, eq } from 'drizzle-orm';
import { messages, runs } from '@nebula-chat/db';
import { db } from '@worker/db';
import type { RunStore } from '@worker/runs/executeRun';
import type { WaitingRunStore } from '@worker/runs/endClarifyingWait';

/** The Postgres `RunStore`. Owner-scoped like the server's reads (ADR-0010 §2). */
export const runRepository: RunStore = {
  async findRun(runId, userId) {
    const [row] = await db
      .select({ id: runs.id })
      .from(runs)
      .where(and(eq(runs.id, runId), eq(runs.userId, userId)));
    return row ?? null;
  },
  async findRecentMessages(sessionId, limit) {
    return db
      .select({ id: messages.id, role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  },
  async markRunning(runId, tokenBudget) {
    await db
      .update(runs)
      .set({ status: 'running', tokenBudget, startedAt: new Date() })
      .where(eq(runs.id, runId));
  },
  async markWaiting(runId, tokensUsed) {
    const rows = await db
      .update(runs)
      .set({ status: 'waiting', tokensUsed })
      .where(and(eq(runs.id, runId), eq(runs.status, 'running')))
      .returning({ id: runs.id });
    return rows.length > 0;
  },
  async saveBrief(runId, brief) {
    await db.update(runs).set({ brief }).where(eq(runs.id, runId));
  },
  async finishRun(runId, { status, tokensUsed }) {
    await db
      .update(runs)
      .set({ status, tokensUsed, finishedAt: new Date() })
      .where(eq(runs.id, runId));
  },
  async createAssistantMessage({ id, sessionId, runId, content, tokenCount }) {
    await db
      .insert(messages)
      .values({ id, sessionId, runId, role: 'assistant', content, tokenCount })
      // A retry after a crash between this insert and `finishRun` finds its answer already written.
      .onConflictDoNothing({ target: messages.id });
  },
};

export const waitingRunRepository: WaitingRunStore = {
  async settleWaiting(runId, next) {
    const [row] = await db
      .update(runs)
      .set(next === 'cancelled' ? { status: next, finishedAt: new Date() } : { status: next })
      .where(and(eq(runs.id, runId), eq(runs.status, 'waiting')))
      .returning({ userId: runs.userId, sessionId: runs.sessionId, messageId: runs.messageId });
    return row ?? null;
  },
};
