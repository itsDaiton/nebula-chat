import { and, asc, count, eq } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { runs, steps } from '@nebula-chat/db';
import type { DbTransaction } from '@nebula-chat/db';
import { db } from '@server/db';
import type { RunWithSteps } from '@server/modules/run/run.types';

const loadWithSteps = async (where: SQL | undefined): Promise<RunWithSteps | null> => {
  const [run] = await db.select().from(runs).where(where);
  if (!run) return null;
  const rows = await db
    .select()
    .from(steps)
    .where(eq(steps.runId, run.id))
    .orderBy(asc(steps.startedAt), asc(steps.turn), asc(steps.id));
  return { ...run, steps: rows };
};

export const runRepository: {
  createTx: (
    tx: DbTransaction,
    data: { userId: string; sessionId: string; messageId: string },
  ) => Promise<{ id: string }>;
  /** Moves the Session's `waiting` Run to `queued` in one conditional update; null when none is waiting or the timeout won. */
  claimWaitingTx: (
    tx: DbTransaction,
    sessionId: string,
    userId: string,
  ) => Promise<{ id: string; messageId: string } | null>;
  findWaiting: (filter: {
    sessionId?: string;
    userId?: string;
  }) => Promise<{ id: string; sessionId: string }[]>;
  countCompletedSteps: (runId: string) => Promise<number>;
  /** The User's own Run with its Steps in execution order; null when it is missing or someone else's. */
  findOwnedWithSteps: (runId: string, userId: string) => Promise<RunWithSteps | null>;
  /** Any User's Run with its Steps; only the audited Admin read may call it. */
  findAnyWithSteps: (runId: string) => Promise<RunWithSteps | null>;
} = {
  async createTx(tx, data) {
    const [row] = await tx.insert(runs).values(data).returning({ id: runs.id });
    return row!;
  },
  async claimWaitingTx(tx, sessionId, userId) {
    const [row] = await tx
      .update(runs)
      .set({ status: 'queued' })
      .where(
        and(eq(runs.sessionId, sessionId), eq(runs.userId, userId), eq(runs.status, 'waiting')),
      )
      .returning({ id: runs.id, messageId: runs.messageId });
    return row ?? null;
  },
  async findWaiting({ sessionId, userId }) {
    return db
      .select({ id: runs.id, sessionId: runs.sessionId })
      .from(runs)
      .where(
        and(
          eq(runs.status, 'waiting'),
          sessionId ? eq(runs.sessionId, sessionId) : undefined,
          userId ? eq(runs.userId, userId) : undefined,
        ),
      );
  },
  async countCompletedSteps(runId) {
    const [row] = await db
      .select({ total: count() })
      .from(steps)
      .where(and(eq(steps.runId, runId), eq(steps.status, 'completed')));
    return row?.total ?? 0;
  },
  findOwnedWithSteps: (runId, userId) =>
    loadWithSteps(and(eq(runs.id, runId), eq(runs.userId, userId))),
  findAnyWithSteps: (runId) => loadWithSteps(eq(runs.id, runId)),
};
