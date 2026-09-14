import { beforeEach, describe, expect, it } from 'vitest';
import { useDrawerStore } from '@/shared/stores/useDrawerStore';
import { useMultiLineStore } from '@/shared/stores/useMultiLineStore';
import { useSearchStore } from '@/shared/stores/useSearchStore';

// Zustand stores are module-level singletons, so state is reset explicitly
// rather than relying on a fresh import per test.
beforeEach(() => {
  useDrawerStore.setState({ isDrawerOpen: false });
  useSearchStore.setState({ isSearchOpen: false });
  useMultiLineStore.setState({ multiLineMap: {} });
});

describe.each([
  ['useDrawerStore', useDrawerStore, 'isDrawerOpen', 'openDrawer', 'closeDrawer', 'toggleDrawer'],
  ['useSearchStore', useSearchStore, 'isSearchOpen', 'openSearch', 'closeSearch', 'toggleSearch'],
] as const)('%s', (_name, store, flag, open, close, toggle) => {
  const state = () => store.getState() as unknown as Record<string, unknown>;
  const read = () => state()[flag] as boolean;
  const call = (action: string) => (state()[action] as () => void)();

  it('starts closed', () => {
    expect(read()).toBe(false);
  });

  it('opens', () => {
    call(open);

    expect(read()).toBe(true);
  });

  it('closes', () => {
    call(open);
    call(close);

    expect(read()).toBe(false);
  });

  it('is idempotent when opened twice', () => {
    call(open);
    call(open);

    expect(read()).toBe(true);
  });

  it('toggles from closed to open and back', () => {
    call(toggle);
    expect(read()).toBe(true);

    call(toggle);
    expect(read()).toBe(false);
  });
});

describe('useMultiLineStore', () => {
  it('starts with no entries', () => {
    expect(useMultiLineStore.getState().multiLineMap).toEqual({});
  });

  it('records a flag against its content key', () => {
    useMultiLineStore.getState().setIsMultiLine('hello', true);

    expect(useMultiLineStore.getState().multiLineMap).toEqual({ hello: true });
  });

  it('overwrites an existing entry', () => {
    useMultiLineStore.getState().setIsMultiLine('hello', true);
    useMultiLineStore.getState().setIsMultiLine('hello', false);

    expect(useMultiLineStore.getState().multiLineMap['hello']).toBe(false);
  });

  it('keeps entries for different content independent', () => {
    useMultiLineStore.getState().setIsMultiLine('a', true);
    useMultiLineStore.getState().setIsMultiLine('b', false);

    expect(useMultiLineStore.getState().multiLineMap).toEqual({ a: true, b: false });
  });

  it('removes a single entry, leaving the rest', () => {
    useMultiLineStore.getState().setIsMultiLine('a', true);
    useMultiLineStore.getState().setIsMultiLine('b', true);

    useMultiLineStore.getState().removeEntry('a');

    expect(useMultiLineStore.getState().multiLineMap).toEqual({ b: true });
  });

  it('ignores removal of an entry that was never set', () => {
    useMultiLineStore.getState().removeEntry('missing');

    expect(useMultiLineStore.getState().multiLineMap).toEqual({});
  });

  it('replaces the map rather than mutating it, so subscribers re-render', () => {
    const before = useMultiLineStore.getState().multiLineMap;

    useMultiLineStore.getState().setIsMultiLine('a', true);

    expect(useMultiLineStore.getState().multiLineMap).not.toBe(before);
  });
});
