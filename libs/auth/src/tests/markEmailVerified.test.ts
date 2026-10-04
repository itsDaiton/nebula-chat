import { describe, expect, it, vi } from 'vitest';
import { users } from '@nebula-chat/db';
import type { DbClient } from '@nebula-chat/db';
import { markEmailVerified } from '../markEmailVerified';

/** A chainable fake of Drizzle's `update(table).set(values).where(condition)`. */
const makeDb = () => {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  return { db: { update } as unknown as DbClient, update, set, where };
};

describe('markEmailVerified', () => {
  it("marks the user's email verified", async () => {
    const { db, update, set } = makeDb();

    await markEmailVerified(db, 'user-1');

    expect(update).toHaveBeenCalledWith(users);
    expect(set).toHaveBeenCalledWith({ emailVerified: true });
  });

  it('scopes the update to that one user', async () => {
    const { db, where } = makeDb();

    await markEmailVerified(db, 'user-1');

    expect(where).toHaveBeenCalledOnce();
  });
});
