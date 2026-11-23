import { drizzle } from 'drizzle-orm/node-postgres';
import { describe, expect, it, vi } from 'vitest';

// ADR-0008 forbids a live database, so the query is built on a driverless Drizzle and read from the failure it raises.
vi.mock('@server/db', () => ({ db: drizzle.mock() }));

import { runRepository } from '@server/modules/run/run.repository';

const USER_ID = '3b3d9780-0986-47cb-b5a7-2c497950aa14';
const RUN_ID = 'f621b1b9-abe2-4224-bef4-360fc36aa551';

const sqlOf = async (run: () => Promise<unknown>) => {
  const error = await run().then(
    () => undefined,
    (cause: unknown) => cause as Error,
  );
  return error?.message ?? '';
};

describe('runRepository', () => {
  it('filters the owner read on both the Run id and its owner', async () => {
    const query = await sqlOf(() => runRepository.findOwnedWithSteps(RUN_ID, USER_ID));

    expect(query).toContain('"runs"."id" = $1');
    expect(query).toContain('"runs"."user_id" = $2');
  });

  it('filters the Admin read on the Run id alone', async () => {
    const query = await sqlOf(() => runRepository.findAnyWithSteps(RUN_ID));

    expect(query).toContain('"runs"."id" = $1');
    expect(query).not.toContain('"runs"."user_id"');
  });
});
