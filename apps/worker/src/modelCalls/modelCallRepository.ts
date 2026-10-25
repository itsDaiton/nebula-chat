import { modelCalls } from '@nebula-chat/db';
import { db } from '@worker/db';
import type { ModelCallLedger } from '@worker/modelCalls/recordModelCall';

/** The Postgres `ModelCallLedger`: a call already recorded under its key is left as it was. */
export const modelCallRepository: ModelCallLedger = {
  async append(call) {
    await db
      .insert(modelCalls)
      .values(call)
      .onConflictDoNothing({ target: modelCalls.idempotencyKey });
  },
};
