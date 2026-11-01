import { drizzle } from 'drizzle-orm/node-postgres';
import { describe, expect, it, vi } from 'vitest';

// ADR-0008 forbids a live database, so the query is built on a driverless Drizzle and read from the failure it raises.
vi.mock('@server/db', () => ({ db: drizzle.mock() }));

import { messageRepository } from '@server/modules/message/message.repository';

const USER_ID = '3b3d9780-0986-47cb-b5a7-2c497950aa14';
const SESSION_ID = 'f621b1b9-abe2-4224-bef4-360fc36aa551';

const sqlOf = async (run: () => Promise<unknown>) => {
  const error = await run().then(
    () => undefined,
    (cause: unknown) => cause as Error,
  );
  return error?.message ?? '';
};

describe('messageRepository', () => {
  it('qualifies the Run cost, so it cannot clash with the direct call cost', async () => {
    const query = await sqlOf(() => messageRepository.findAll(USER_ID, SESSION_ID));

    expect(query).toContain('coalesce("direct_call"."cost_usd", "run_cost"."cost_usd")');
    expect(query).not.toContain('"direct_call"."cost_usd", "cost_usd")');
  });
});
