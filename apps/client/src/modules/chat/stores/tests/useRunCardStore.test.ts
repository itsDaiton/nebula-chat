import { beforeEach, describe, expect, it } from 'vitest';
import { useRunCardStore } from '@/modules/chat/stores/useRunCardStore';

describe('useRunCardStore', () => {
  beforeEach(() => useRunCardStore.setState({ expanded: {} }));

  it('keeps the choice made for each Run apart', () => {
    useRunCardStore.getState().setExpanded('r1', true);
    useRunCardStore.getState().setExpanded('r2', false);
    useRunCardStore.getState().setExpanded('r1', false);

    expect(useRunCardStore.getState().expanded).toEqual({ r1: false, r2: false });
  });
});
