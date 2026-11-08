import { drizzle } from 'drizzle-orm/node-postgres';
import { describe, expect, it, vi } from 'vitest';

// ADR-0008 forbids a live database, so the query is built on a driverless Drizzle and read from the failure it raises.
vi.mock('@server/db', () => ({ db: drizzle.mock() }));

import { sessionRepository } from '@server/modules/session/session.repository';

const USER_ID = '3b3d9780-0986-47cb-b5a7-2c497950aa14';
const SESSION_ID = 'f621b1b9-abe2-4224-bef4-360fc36aa551';

const sqlOf = async (run: () => Promise<unknown>) => {
  const error = await run().then(
    () => undefined,
    (cause: unknown) => cause as Error,
  );
  return error?.message ?? '';
};

describe('sessionRepository', () => {
  it('selects archivedAt and a table-qualified message count, scoped to the owner', async () => {
    const query = await sqlOf(() => sessionRepository.findById({ sessionId: SESSION_ID }, USER_ID));

    expect(query).toContain('"archived_at"');
    expect(query).toContain(
      '(select count(*)::int from "messages" where "messages"."session_id" = "sessions"."id")',
    );
    expect(query).toContain('"sessions"."user_id" = $2');
  });
});
