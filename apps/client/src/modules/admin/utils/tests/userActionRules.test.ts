import { describe, expect, it } from 'vitest';
import type { AdminUserDetail } from '@/libs/api/generated/model/adminUserDetail';
import { userActionRules } from '@/modules/admin/utils/userActionRules';
import { resources } from '@/resources';

const { reasons } = resources.admin.users.actions;

const user = (overrides: Partial<AdminUserDetail> = {}): AdminUserDetail => ({
  id: 'u1',
  email: 'anna@example.com',
  name: 'Anna',
  status: 'registered',
  twoFactorEnabled: false,
  messagesSent: 0,
  sessionsCount: 0,
  createdAt: '2026-03-12T10:00:00Z',
  updatedAt: '2026-03-12T10:00:00Z',
  ban: null,
  pendingDeletionAt: null,
  ...overrides,
});

const none = { lastAdmin: false, self: false };

describe('userActionRules', () => {
  it('allows every action a Registered User is eligible for', () => {
    const rules = userActionRules(user(), none);
    expect(rules.role.disabledReason).toBeUndefined();
    expect(rules.ban.disabledReason).toBeUndefined();
    expect(rules.restore.disabledReason).toBe(reasons.notPending);
  });

  it.each([
    ['guest', reasons.guest],
    ['unverified', reasons.unverified],
  ] as const)('refuses Admin for a %s User', (status, reason) => {
    expect(userActionRules(user({ status }), none).role.disabledReason).toBe(reason);
  });

  it('refuses Admin for a banned User and the tooltip names Unban', () => {
    const banned = user({ status: 'banned', ban: { reason: 'Spam', expiresAt: null } });
    expect(userActionRules(banned, none).role.disabledReason).toBe(reasons.banned);
  });

  it('refuses Revoke and Ban for the last Admin only', () => {
    const admin = user({ status: 'admin' });
    const rules = userActionRules(admin, { lastAdmin: true, self: false });
    expect(rules.role.disabledReason).toBe(reasons.lastAdmin);
    expect(rules.ban.disabledReason).toBe(reasons.lastAdmin);
    expect(userActionRules(admin, none).role.disabledReason).toBeUndefined();
  });

  it('refuses Ban on yourself', () => {
    expect(userActionRules(user(), { lastAdmin: false, self: true }).ban.disabledReason).toBe(
      reasons.self,
    );
  });

  it('allows Restore only while the account is pending deletion', () => {
    const pending = user({ pendingDeletionAt: '2026-10-25T12:00:00Z' });
    expect(userActionRules(pending, none).restore.disabledReason).toBeUndefined();
  });
});
