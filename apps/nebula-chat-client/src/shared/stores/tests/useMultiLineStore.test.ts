import { beforeEach, describe, expect, it } from 'vitest';
import { useMultiLineStore } from '@/shared/stores/useMultiLineStore';

// Zustand stores are module-level singletons, so state is reset explicitly
// rather than relying on a fresh import per test.
beforeEach(() => {
  useMultiLineStore.setState({ multiLineMap: {} });
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
