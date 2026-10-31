import { APIError } from 'better-auth/api';
import { describe, expect, it, vi } from 'vitest';
import { markTwoFactorVerifiedSession } from '../twoFactorSession';

const hookContext = (path: string, returned: unknown) => {
  const updateSession = vi.fn(async () => null);
  return {
    ctx: { path, context: { returned, internalAdapter: { updateSession } } },
    updateSession,
  };
};

describe('markTwoFactorVerifiedSession', () => {
  it.each(['/two-factor/verify-totp', '/two-factor/verify-backup-code', '/two-factor/verify-otp'])(
    'marks the auth session a successful %s answers with',
    async (path) => {
      const { ctx, updateSession } = hookContext(path, { token: 'session-token', user: {} });

      await markTwoFactorVerifiedSession(ctx);

      expect(updateSession).toHaveBeenCalledExactlyOnceWith('session-token', {
        twoFactorVerified: true,
      });
    },
  );

  it('marks nothing when the code was wrong', async () => {
    const { ctx, updateSession } = hookContext(
      '/two-factor/verify-totp',
      APIError.from('UNAUTHORIZED', { code: 'INVALID_CODE', message: 'Invalid code' }),
    );

    await markTwoFactorVerifiedSession(ctx);

    expect(updateSession).not.toHaveBeenCalled();
  });

  it('marks nothing when a backup code was spent without a session', async () => {
    const { ctx, updateSession } = hookContext('/two-factor/verify-backup-code', {
      token: undefined,
      user: {},
    });

    await markTwoFactorVerifiedSession(ctx);

    expect(updateSession).not.toHaveBeenCalled();
  });

  it.each(['/sign-in/email', '/get-session', '/two-factor/enable'])(
    'leaves a session %s answers with alone',
    async (path) => {
      const { ctx, updateSession } = hookContext(path, { token: 'session-token' });

      await markTwoFactorVerifiedSession(ctx);

      expect(updateSession).not.toHaveBeenCalled();
    },
  );
});
