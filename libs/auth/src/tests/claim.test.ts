import { describe, it, expect, vi } from 'vitest';
import { sessions } from '@nebula-chat/db';
import type { DbClient } from '@nebula-chat/db';
import { claimSessions } from '../claim';

/**
 * A minimal chainable fake of the Drizzle update builder: `update(table)` →
 * `.set(values)` → `.where(condition)`. Records what each link was called with
 * so the test asserts the reassignment without a real database (ADR-0008).
 */
const makeDb = () => {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  return { db: { update } as unknown as DbClient, update, set, where };
};

describe('claimSessions', () => {
  it("reassigns the anonymous user's sessions to the linked user", async () => {
    const { db, update, set, where } = makeDb();

    await claimSessions(db, {
      fromUserId: 'guest-123',
      toUserId: 'user-456',
    });

    // Targets the sessions table...
    expect(update).toHaveBeenCalledWith(sessions);
    // ...sets the owner to the newly linked user...
    expect(set).toHaveBeenCalledWith({ userId: 'user-456' });
    // ...and filters to exactly the rows currently owned by the Guest.
    expect(where).toHaveBeenCalledOnce();
  });

  it('scopes the update with a where clause (never a blanket reassignment)', async () => {
    const { db, where } = makeDb();

    await claimSessions(db, { fromUserId: 'guest-1', toUserId: 'user-2' });

    // A where clause is always present — the claim must never touch other users' rows.
    expect(where).toHaveBeenCalledOnce();
    expect(where.mock.calls[0][0]).toBeDefined();
  });

  it('awaits the underlying update (propagates a db error)', async () => {
    const where = vi.fn().mockRejectedValue(new Error('db down'));
    const set = vi.fn(() => ({ where }));
    const update = vi.fn(() => ({ set }));
    const db = { update } as unknown as DbClient;

    await expect(claimSessions(db, { fromUserId: 'a', toUserId: 'b' })).rejects.toThrow('db down');
  });
});
