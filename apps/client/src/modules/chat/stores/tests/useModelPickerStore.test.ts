import { beforeEach, describe, expect, it } from 'vitest';
import { useModelPickerStore } from '@/modules/chat/stores/useModelPickerStore';

beforeEach(() => {
  useModelPickerStore.setState({ isOpen: false, search: '' });
});

describe('useModelPickerStore', () => {
  it('starts closed and unfiltered', () => {
    expect(useModelPickerStore.getState()).toMatchObject({ isOpen: false, search: '' });
  });

  it('keeps the search while open', () => {
    useModelPickerStore.getState().setOpen(true);
    useModelPickerStore.getState().setSearch('gpt');

    expect(useModelPickerStore.getState().search).toBe('gpt');
  });

  it('clears the search when it closes', () => {
    useModelPickerStore.setState({ isOpen: true, search: 'gpt' });

    useModelPickerStore.getState().setOpen(false);

    expect(useModelPickerStore.getState()).toMatchObject({ isOpen: false, search: '' });
  });
});
