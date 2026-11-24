import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditEntryInput } from '@server/modules/audit/audit.types';

vi.mock('@server/modules/audit/audit.repository', () => ({
  auditRepository: { insert: vi.fn(), list: vi.fn() },
}));

import { auditRepository } from '@server/modules/audit/audit.repository';
import { auditService } from '@server/modules/audit/audit.service';

const insert = vi.mocked(auditRepository.insert);

const ID = '33333333-3333-4333-8333-333333333333';
const base = { actorType: 'admin', actorUserId: ID, targetType: 'user', targetId: ID } as const;

const allowed: [AuditEntryInput['action'], Record<string, unknown>][] = [
  ['admin.granted', { role: { from: 'user', to: 'admin' } }],
  ['user.role_changed', { role: { from: 'admin', to: 'user' } }],
  ['user.banned', { reason: 'spam', note: 'internal', expiresAt: null }],
  ['user.unbanned', { reason: null }],
  ['user.restored', { pendingDeletionAt: '2026-10-30T12:00:00.000Z' }],
  ['session.read', { userId: ID }],
  ['run.read', { userId: ID, sessionId: ID }],
  ['users.purged', { pendingUsers: 1, guests: 2, failed: 0 }],
];

beforeEach(() => {
  vi.clearAllMocks();
  insert.mockResolvedValue(undefined);
});

describe('auditService.append', () => {
  it.each(allowed)('writes %s with its allowed detail', async (action, detail) => {
    const entry = { ...base, action, detail } as AuditEntryInput;

    await auditService.append(entry);

    expect(insert).toHaveBeenCalledWith(entry);
  });

  it.each(allowed)('rejects %s carrying a key it does not allow', (action, detail) => {
    const entry = { ...base, action, detail: { ...detail, content: 'hello' } };

    expect(() => auditService.append(entry as unknown as AuditEntryInput)).toThrow();
    expect(insert).not.toHaveBeenCalled();
  });
});
