import { setSessionCookie } from 'better-auth/cookies';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbClient } from '@nebula-chat/db';
import { restoreAccountPlugin } from '../restoreAccount';

vi.mock('better-auth/cookies', () => ({ setSessionCookie: vi.fn() }));

const USER = { id: 'user-1', email: 'ada@example.com' };
const SESSION = { id: 'session-1', token: 'token' };

const makeDb = () => {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  return { db: { update: vi.fn(() => ({ set })) } as unknown as DbClient, set };
};

const restore = (
  db: DbClient,
  { body, record }: { body: unknown; record: { value: string; expiresAt: Date } | null },
) => {
  const internalAdapter = {
    consumeVerificationValue: vi.fn().mockResolvedValue(record),
    findUserById: vi.fn().mockResolvedValue(USER),
    createSession: vi.fn().mockResolvedValue(SESSION),
  };
  const endpoint = restoreAccountPlugin(db).endpoints!['restoreAccount']!;
  const result = endpoint({
    body,
    context: { internalAdapter },
  } as unknown as Parameters<typeof endpoint>[0]);
  return { result, internalAdapter };
};

const valid = () => ({ value: 'user-1', expiresAt: new Date(Date.now() + 60_000) });

beforeEach(() => vi.mocked(setSessionCookie).mockClear());

describe('POST /restore-account', () => {
  it('clears the pending mark and signs the User in', async () => {
    const { db, set } = makeDb();
    const { result, internalAdapter } = restore(db, { body: { token: 'abc' }, record: valid() });

    await expect(result).resolves.toMatchObject({ success: true });

    expect(set).toHaveBeenCalledWith({ pendingDeletionAt: null });
    expect(internalAdapter.createSession).toHaveBeenCalledWith('user-1');
    expect(setSessionCookie).toHaveBeenCalledOnce();
    expect(internalAdapter.consumeVerificationValue).toHaveBeenCalledWith('restore-account:abc');
  });

  it.each([
    ['an unknown token', { token: 'nope' }, null],
    ['an expired token', { token: 'old' }, { value: 'user-1', expiresAt: new Date(0) }],
    ['a missing token', {}, valid()],
  ])('leaves the account pending for %s', async (_name, body, record) => {
    const { db, set } = makeDb();
    const { result, internalAdapter } = restore(db, { body, record });

    await expect(result).rejects.toMatchObject({ body: { code: 'INVALID_RESTORE_TOKEN' } });

    expect(set).not.toHaveBeenCalled();
    expect(internalAdapter.createSession).not.toHaveBeenCalled();
  });
});
