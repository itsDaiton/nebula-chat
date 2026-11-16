import { describe, expect, it, vi } from 'vitest';
import { users } from '@nebula-chat/db';
import type { DbClient } from '@nebula-chat/db';
import {
  clearPendingDeletion,
  findPendingUserByEmail,
  isSessionFresh,
  markPendingDeletion,
  purgeDateOf,
} from '../pendingDeletion';

const NOW = new Date('2026-10-20T10:00:00.000Z');

describe('purgeDateOf', () => {
  it('is 30 days after the deletion', () => {
    expect(purgeDateOf(new Date('2026-10-01T00:00:00.000Z')).toISOString()).toBe(
      '2026-10-31T00:00:00.000Z',
    );
  });
});

describe('isSessionFresh', () => {
  const DAY = 24 * 60 * 60;

  it('accepts a sign-in under the fresh age', () => {
    expect(isSessionFresh(new Date(NOW.getTime() - 1000), DAY, NOW)).toBe(true);
  });

  it('refuses a sign-in at or over the fresh age', () => {
    expect(isSessionFresh(new Date(NOW.getTime() - DAY * 1000), DAY, NOW)).toBe(false);
  });

  it('accepts any sign-in when the check is disabled', () => {
    expect(isSessionFresh(new Date(0), 0, NOW)).toBe(true);
  });
});

describe('pending deletion writes', () => {
  const makeDb = () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn(() => ({ where }));
    const update = vi.fn(() => ({ set }));
    return { db: { update } as unknown as DbClient, update, set, where };
  };

  it('marks the User with the deletion time', async () => {
    const { db, update, set, where } = makeDb();

    await markPendingDeletion(db, 'user-1', NOW);

    expect(update).toHaveBeenCalledWith(users);
    expect(set).toHaveBeenCalledWith({ pendingDeletionAt: NOW });
    expect(where).toHaveBeenCalledOnce();
  });

  it('clears the mark on restore', async () => {
    const { db, set } = makeDb();

    await clearPendingDeletion(db, 'user-1');

    expect(set).toHaveBeenCalledWith({ pendingDeletionAt: null });
  });
});

describe('findPendingUserByEmail', () => {
  const makeDb = (rows: { pendingDeletionAt: Date | null; twoFactorEnabled: boolean }[]) => {
    const where = vi.fn().mockResolvedValue(rows);
    return { select: () => ({ from: () => ({ where }) }) } as unknown as DbClient;
  };

  it('returns the deletion time and two-factor state of a pending User', async () => {
    const db = makeDb([{ pendingDeletionAt: NOW, twoFactorEnabled: true }]);

    expect(await findPendingUserByEmail(db, 'ada@example.com')).toEqual({
      pendingDeletionAt: NOW,
      twoFactorEnabled: true,
    });
  });

  it('returns null for a User who is not pending', async () => {
    const db = makeDb([{ pendingDeletionAt: null, twoFactorEnabled: true }]);

    expect(await findPendingUserByEmail(db, 'ada@example.com')).toBeNull();
  });

  it('returns null when no User has that email', async () => {
    expect(await findPendingUserByEmail(makeDb([]), 'none@example.com')).toBeNull();
  });
});
