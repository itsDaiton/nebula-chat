import { eq, sql } from 'drizzle-orm';
import { steps } from '@nebula-chat/db';
import { db } from '@worker/db';
import type { StepStore } from '@worker/runs/steps';

/** The Postgres `StepStore`: a Step started again is a re-run, so its row is reset and its attempt goes up. */
export const stepRepository: StepStore = {
  async start({ id, runId, phase, name, input }) {
    const [row] = await db
      .insert(steps)
      .values({ id, runId, phase, name, input })
      .onConflictDoUpdate({
        target: steps.id,
        set: {
          attempt: sql`${steps.attempt} + 1`,
          status: 'running',
          input,
          output: null,
          error: null,
          tokens: null,
          startedAt: new Date(),
          finishedAt: null,
        },
      })
      .returning({ attempt: steps.attempt });
    return row!.attempt;
  },
  async finish(stepId, result) {
    await db
      .update(steps)
      .set({
        status: result.status,
        tokens: result.tokens,
        ...(result.status === 'completed' ? { output: result.output } : { error: result.error }),
        finishedAt: new Date(),
      })
      .where(eq(steps.id, stepId));
  },
};
