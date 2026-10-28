import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCommandPaletteStore } from '@/modules/commandPalette/stores/useCommandPaletteStore';
import type { PaletteAction } from '@/modules/commandPalette/types/types';

const anAction = (id: string): PaletteAction => ({
  id,
  group: 'Actions',
  label: id,
  icon: null,
  perform: () => {},
});

beforeEach(() => {
  vi.useFakeTimers();
  useCommandPaletteStore.setState({ actions: [] });
  useCommandPaletteStore.getState().clearQuery();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useCommandPaletteStore', () => {
  it('registers actions and removes only those on unregister', () => {
    const { register } = useCommandPaletteStore.getState();
    const unregisterA = register([anAction('a')]);
    register([anAction('b')]);

    unregisterA();

    expect(useCommandPaletteStore.getState().actions.map((a) => a.id)).toEqual(['b']);
  });

  it('replaces an action registered again under the same id', () => {
    const { register } = useCommandPaletteStore.getState();
    register([anAction('a')]);
    register([{ ...anAction('a'), label: 'renamed' }]);

    expect(useCommandPaletteStore.getState().actions).toHaveLength(1);
    expect(useCommandPaletteStore.getState().actions[0].label).toBe('renamed');
  });

  it('debounces the query and clears it', () => {
    const { setQuery, clearQuery } = useCommandPaletteStore.getState();

    setQuery('ru');
    setQuery('run');
    expect(useCommandPaletteStore.getState().debouncedQuery).toBe('');
    vi.advanceTimersByTime(300);
    expect(useCommandPaletteStore.getState().debouncedQuery).toBe('run');

    setQuery('runs');
    clearQuery();
    vi.advanceTimersByTime(300);
    expect(useCommandPaletteStore.getState()).toMatchObject({ query: '', debouncedQuery: '' });
  });
});
