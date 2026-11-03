import { describe, expect, it } from 'vitest';
import type { PaletteAction } from '@/modules/commandPalette/types/types';
import { matchesQuery } from '@/modules/commandPalette/utils/matchesQuery';

const action: PaletteAction = {
  id: 'toggle-theme',
  group: 'Actions',
  label: 'Toggle theme',
  keywords: ['dark'],
  icon: null,
  perform: () => {},
};

describe('matchesQuery', () => {
  it('matches the label, keywords and group, ignoring case and padding', () => {
    expect(matchesQuery(action, ' THEME ')).toBe(true);
    expect(matchesQuery(action, 'dark')).toBe(true);
    expect(matchesQuery(action, 'actions')).toBe(true);
  });

  it('matches everything for an empty query and nothing unrelated', () => {
    expect(matchesQuery(action, '')).toBe(true);
    expect(matchesQuery(action, 'zebra')).toBe(false);
  });
});
