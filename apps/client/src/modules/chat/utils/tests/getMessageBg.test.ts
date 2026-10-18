import { describe, expect, it } from 'vitest';
import { getMessageBg } from '@/modules/chat/utils/getMessageBg';

describe('getMessageBg', () => {
  it('gives user and assistant messages distinct backgrounds in both themes', () => {
    const user = getMessageBg(true);
    const assistant = getMessageBg(false);

    expect(user.base).not.toBe(assistant.base);
    expect(user._dark).not.toBe(assistant._dark);
  });

  it('always supplies a dark-mode token', () => {
    expect(getMessageBg(true)._dark).toBeTruthy();
    expect(getMessageBg(false)._dark).toBeTruthy();
  });
});
