import { describe, expect, it, vi } from 'vitest';
import { findResetPasswordRejection } from '../resetPassword';
import type { ResetPasswordChecks } from '../resetPassword';

const NOW = new Date('2026-10-04T12:00:00.000Z');
const IN_AN_HOUR = new Date('2026-10-04T13:00:00.000Z');

/** Checks for a live token owned by `user-1`, whose current password is `old-passphrase`. */
const makeChecks = (overrides: Partial<ResetPasswordChecks> = {}): ResetPasswordChecks => ({
  findResetToken: vi.fn().mockResolvedValue({ userId: 'user-1', expiresAt: IN_AN_HOUR }),
  findPasswordHash: vi.fn().mockResolvedValue('hash-of-old-passphrase'),
  verifyPassword: vi.fn(async (_hash: string, password: string) => password === 'old-passphrase'),
  isPasswordCompromised: vi.fn().mockResolvedValue(false),
  now: () => NOW,
  ...overrides,
});

const attempt = (newPassword: string, checks: ResetPasswordChecks) =>
  findResetPasswordRejection({ token: 'token-1', newPassword }, checks);

describe('findResetPasswordRejection', () => {
  it('accepts a fresh password on a live token', async () => {
    expect(await attempt('a-brand-new-passphrase', makeChecks())).toBeNull();
  });

  it('refuses the current password', async () => {
    expect(await attempt('old-passphrase', makeChecks())).toBe('PASSWORD_REUSED');
  });

  it('refuses a password found in a data breach', async () => {
    const checks = makeChecks({ isPasswordCompromised: vi.fn().mockResolvedValue(true) });

    expect(await attempt('a-brand-new-passphrase', checks)).toBe('PASSWORD_COMPROMISED');
  });

  it('checks the password of the user the token belongs to', async () => {
    const checks = makeChecks();

    await attempt('a-brand-new-passphrase', checks);

    expect(checks.findResetToken).toHaveBeenCalledWith('token-1');
    expect(checks.findPasswordHash).toHaveBeenCalledWith('user-1');
  });

  it.each([
    ['an unknown token', null],
    ['an expired token', { userId: 'user-1', expiresAt: new Date('2026-10-04T11:59:59.000Z') }],
    // Redis hands the record back as JSON, so the expiry arrives as a string.
    [
      'an expired token read from JSON',
      { userId: 'user-1', expiresAt: '2026-10-04T11:00:00.000Z' },
    ],
  ])(
    "leaves %s to better-auth's own INVALID_TOKEN, without checking the password",
    async (_case, token) => {
      const checks = makeChecks({ findResetToken: vi.fn().mockResolvedValue(token) });

      expect(await attempt('old-passphrase', checks)).toBeNull();
      expect(checks.isPasswordCompromised).not.toHaveBeenCalled();
      expect(checks.verifyPassword).not.toHaveBeenCalled();
    },
  );

  it('skips the reuse check for an account with no password yet', async () => {
    const checks = makeChecks({ findPasswordHash: vi.fn().mockResolvedValue(null) });

    expect(await attempt('old-passphrase', checks)).toBeNull();
    expect(checks.verifyPassword).not.toHaveBeenCalled();
  });
});
