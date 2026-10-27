import { runs } from '@nebula-chat/db';
import type { DbTransaction } from '@nebula-chat/db';

export const runRepository: {
  createTx: (
    tx: DbTransaction,
    data: { userId: string; sessionId: string; messageId: string },
  ) => Promise<{ id: string }>;
} = {
  async createTx(tx, data) {
    const [row] = await tx.insert(runs).values(data).returning({ id: runs.id });
    return row!;
  },
};
