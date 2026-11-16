import { describe, expect, it } from 'vitest';
import { banSchema } from '@/modules/admin/utils/banSchema';
import { resources } from '@/resources';

const text = resources.admin.users.ban;

const messages = (value: unknown) => {
  const result = banSchema.safeParse(value);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('banSchema', () => {
  it('accepts a permanent ban with a reason', () => {
    expect(messages({ reason: 'Spam', duration: 'permanent', until: '' })).toEqual([]);
  });

  it('requires a non-blank reason', () => {
    expect(messages({ reason: '   ', duration: 'permanent', until: '' })).toEqual([
      text.reasonRequired,
    ]);
  });

  it('caps the reason at 500 characters', () => {
    expect(messages({ reason: 'a'.repeat(501), duration: 'permanent', until: '' })).toEqual([
      text.reasonTooLong,
    ]);
  });

  it('requires a date for a ban until a date', () => {
    expect(messages({ reason: 'Spam', duration: 'until', until: '' })).toEqual([text.dateRequired]);
  });

  it('rejects today and the past, and accepts a later day', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(messages({ reason: 'Spam', duration: 'until', until: today })).toEqual([
      text.dateFuture,
    ]);
    expect(messages({ reason: 'Spam', duration: 'until', until: '2020-01-01' })).toEqual([
      text.dateFuture,
    ]);
    expect(messages({ reason: 'Spam', duration: 'until', until: '2999-01-31' })).toEqual([]);
  });

  it('ignores a stale date for a permanent ban', () => {
    expect(messages({ reason: 'Spam', duration: 'permanent', until: '2020-01-01' })).toEqual([]);
  });
});
