import { describe, expect, it, vi } from 'vitest';
import type { DbClient } from '@nebula-chat/db';
import type { Logger } from '@nebula-chat/otel';
import { captureLogger, eventLines } from '@nebula-chat/otel/testing';
import type { AuthStore } from '@nebula-chat/redis';
import { createAuth } from '../auth';
import type { DeletedUser } from '../userDeletion';

/** A chainable fake of Drizzle's `select(fields).from(table).where(condition)`. */
const makeDb = (rows: { profileImageKey: string | null }[]) => {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return { db: { select } as unknown as DbClient, select };
};

const build = ({
  rows = [{ profileImageKey: 'user-1/a.webp' }],
  onUserDeleted,
}: {
  rows?: { profileImageKey: string | null }[];
  onUserDeleted?: (user: DeletedUser) => Promise<void>;
}) => {
  const { db, select } = makeDb(rows);
  const capture = captureLogger('debug');
  const auth = createAuth({
    db,
    authStore: {} as AuthStore,
    logger: capture.logger as Logger,
    secret: 'test-secret-that-is-long-enough-for-better-auth',
    baseURL: 'http://localhost:3000',
    sendEmail: vi.fn(),
    onUserDeleted,
  });
  const deleteUser = auth.options.user!.deleteUser!;
  return { deleteUser, select, lines: capture.lines };
};

const user = () => ({
  id: 'user-1',
  name: 'Ada',
  email: 'ada@example.com',
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

/** Runs better-auth's delete sequence: `beforeDelete`, the row delete, then `afterDelete`. */
const confirmDelete = async (deleteUser: ReturnType<typeof build>['deleteUser']) => {
  const deleted = user();
  await deleteUser.beforeDelete!(deleted);
  await deleteUser.afterDelete!(deleted);
};

describe('createAuth onUserDeleted', () => {
  it('hands a confirmed delete the stored Profile image key', async () => {
    const onUserDeleted = vi.fn(async () => undefined);
    const { deleteUser } = build({ onUserDeleted });

    await confirmDelete(deleteUser);

    expect(onUserDeleted).toHaveBeenCalledExactlyOnceWith({
      id: 'user-1',
      profileImageKey: 'user-1/a.webp',
    });
  });

  it('passes no key for a user without an uploaded image', async () => {
    const onUserDeleted = vi.fn(async () => undefined);
    const { deleteUser } = build({ rows: [{ profileImageKey: null }], onUserDeleted });

    await confirmDelete(deleteUser);

    expect(onUserDeleted).toHaveBeenCalledWith({ id: 'user-1', profileImageKey: null });
  });

  it('does not run when the row was never deleted', async () => {
    const onUserDeleted = vi.fn(async () => undefined);
    const { deleteUser } = build({ onUserDeleted });

    // better-auth reaches `afterDelete` only once the row is gone; a refused or failed
    // delete stops at or before `beforeDelete`.
    await deleteUser.beforeDelete!(user());

    expect(onUserDeleted).not.toHaveBeenCalled();
  });

  it('never fails the delete when the callback throws, and logs it', async () => {
    const err = new Error('storage down');
    const { deleteUser, lines } = build({ onUserDeleted: vi.fn().mockRejectedValue(err) });

    await expect(confirmDelete(deleteUser)).resolves.toBeUndefined();

    expect(eventLines(lines, 'auth.user_deleted_callback.failed')).toEqual([
      expect.objectContaining({ level: 40, 'user.id': 'user-1', err: expect.anything() }),
    ]);
  });

  it('adds no delete hooks, and reads nothing, without a callback', () => {
    const { deleteUser, select } = build({});

    expect(deleteUser.beforeDelete).toBeUndefined();
    expect(deleteUser.afterDelete).toBeUndefined();
    expect(select).not.toHaveBeenCalled();
  });
});
