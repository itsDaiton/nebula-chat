import { describe, expect, it } from 'vitest';
import { isUser } from '@/modules/chat/utils/isUser';

describe('isUser', () => {
  it('recognises the user role', () => {
    expect(isUser('user')).toBe(true);
  });

  it.each(['assistant', 'system', 'User', ''])('rejects %o', (role) => {
    expect(isUser(role)).toBe(false);
  });
});
