import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRegisterPaletteActions } from '@/modules/commandPalette/hooks/useRegisterPaletteActions';
import { useCommandPaletteStore } from '@/modules/commandPalette/stores/useCommandPaletteStore';
import type { PaletteAction } from '@/modules/commandPalette/types/types';

const anAction = (overrides: Partial<PaletteAction> = {}): PaletteAction => ({
  id: 'a',
  group: 'Actions',
  label: 'A',
  icon: null,
  perform: () => {},
  ...overrides,
});

const registeredIds = () => useCommandPaletteStore.getState().actions.map((action) => action.id);

beforeEach(() => {
  useCommandPaletteStore.setState({ actions: [] });
});

describe('useRegisterPaletteActions', () => {
  it('lists the actions while mounted and removes them on unmount', () => {
    const { unmount } = renderHook(() => useRegisterPaletteActions([anAction()]));
    expect(registeredIds()).toEqual(['a']);

    unmount();

    expect(registeredIds()).toEqual([]);
  });

  it('follows visibility', () => {
    const { rerender } = renderHook(
      ({ visible }) => useRegisterPaletteActions([anAction({ visible })]),
      { initialProps: { visible: false } },
    );
    expect(registeredIds()).toEqual([]);

    rerender({ visible: true });

    expect(registeredIds()).toEqual(['a']);
  });

  it('performs the latest render’s closure', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ perform }) => useRegisterPaletteActions([anAction({ perform })]),
      {
        initialProps: { perform: first },
      },
    );

    rerender({ perform: second });
    useCommandPaletteStore.getState().actions[0].perform();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });
});
