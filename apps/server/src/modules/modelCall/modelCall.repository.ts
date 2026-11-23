import { and, gte, lt, eq, sql } from 'drizzle-orm';
import { modelCalls } from '@nebula-chat/db';
import { db } from '@server/db';

export const modelCallRepository: {
  /** Estimated USD of a User's Operator-key Model calls in `[from, to)`; Own-key calls and purged rows never count. */
  sumCostUsd: (userId: string, from: Date, to: Date) => Promise<number>;
} = {
  async sumCostUsd(userId, from, to) {
    const [row] = await db
      .select({ total: sql<number>`coalesce(sum(${modelCalls.costUsd}), 0)::float8` })
      .from(modelCalls)
      .where(
        and(
          eq(modelCalls.userId, userId),
          eq(modelCalls.ownKey, false),
          gte(modelCalls.createdAt, from),
          lt(modelCalls.createdAt, to),
        ),
      );
    return row?.total ?? 0;
  },
};
