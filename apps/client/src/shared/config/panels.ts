import type { ShortcutConfig } from '@/shared/types/types';

export const SIDEBAR_ID = 'app-sidebar';
export const INSPECTOR_ID = 'app-inspector';

export const SIDEBAR_SHORTCUT: ShortcutConfig = { key: 'b', ctrl: true };
export const INSPECTOR_SHORTCUT: ShortcutConfig = { key: 'b', ctrl: true, shift: true };
export const SEARCH_SHORTCUT: ShortcutConfig = { key: 'k', ctrl: true };
