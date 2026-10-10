import { describe, expect, it } from 'vitest';
import { findDeleteAccountRejection } from '../deleteAccount';

describe('findDeleteAccountRejection', () => {
  it('requires the password from a user who has one', () => {
    expect(findDeleteAccountRejection({ hasPassword: true })).toBe('PASSWORD_REQUIRED');
    expect(findDeleteAccountRejection({ password: '', hasPassword: true })).toBe(
      'PASSWORD_REQUIRED',
    );
  });

  it('leaves a sent password for better-auth to verify', () => {
    expect(findDeleteAccountRejection({ password: 'a-passphrase', hasPassword: true })).toBeNull();
  });

  it('lets a user without a password rely on a recent sign-in', () => {
    expect(findDeleteAccountRejection({ hasPassword: false })).toBeNull();
  });
});
