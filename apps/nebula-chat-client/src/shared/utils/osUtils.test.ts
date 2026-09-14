import { describe, expect, it } from 'vitest';
import { getShortcutKeys } from '@/shared/utils/osUtils';

describe('getShortcutKeys', () => {
  it('uses the Command glyph on macOS', () => {
    expect(getShortcutKeys({ key: 'k', ctrl: true }, 'mac')).toEqual(['⌘', 'K']);
  });

  it('uses Ctrl on Windows', () => {
    expect(getShortcutKeys({ key: 'k', ctrl: true }, 'windows')).toEqual(['Ctrl', 'K']);
  });

  it('renders shift per platform', () => {
    expect(getShortcutKeys({ key: 'p', shift: true }, 'mac')).toEqual(['⇧', 'P']);
    expect(getShortcutKeys({ key: 'p', shift: true }, 'windows')).toEqual(['Shift', 'P']);
  });

  it('renders alt per platform', () => {
    expect(getShortcutKeys({ key: 'a', alt: true }, 'mac')).toEqual(['⌥', 'A']);
    expect(getShortcutKeys({ key: 'a', alt: true }, 'windows')).toEqual(['Alt', 'A']);
  });

  it('orders modifiers ctrl, shift, alt before the key', () => {
    expect(getShortcutKeys({ key: 'z', ctrl: true, shift: true, alt: true }, 'mac')).toEqual([
      '⌘',
      '⇧',
      '⌥',
      'Z',
    ]);
  });

  it('returns just the key when no modifier is configured', () => {
    expect(getShortcutKeys({ key: 'n' }, 'windows')).toEqual(['N']);
  });

  it('upper-cases the key for display', () => {
    expect(getShortcutKeys({ key: 'k' }, 'mac')).toEqual(['K']);
  });
});
