import type { OS, ShortcutConfig } from '@/shared/types/types';

export const getShortcutKeys = (shortcut: ShortcutConfig, os: OS): string[] => [
  ...(shortcut.ctrl ? [os === 'mac' ? '⌘' : 'Ctrl'] : []),
  ...(shortcut.shift ? [os === 'mac' ? '⇧' : 'Shift'] : []),
  ...(shortcut.alt ? [os === 'mac' ? '⌥' : 'Alt'] : []),
  shortcut.key.toUpperCase(),
];
