import { useCallback, useRef, useSyncExternalStore } from 'react';
import { useCommandPaletteStore } from '@/modules/commandPalette/stores/useCommandPaletteStore';
import type { PaletteAction } from '@/modules/commandPalette/types/types';

/** Lists the actions in the palette while the calling component is mounted (subscribe lifecycle, no effect). */
export const useRegisterPaletteActions = (actions: PaletteAction[]) => {
  const latest = useRef(actions);
  latest.current = actions;
  const register = useCommandPaletteStore((state) => state.register);
  const visibleIds = actions
    .filter((action) => action.visible !== false)
    .map((action) => action.id)
    .join('\n');

  const subscribe = useCallback(
    () =>
      register(
        latest.current
          .filter((action) => action.visible !== false)
          .map((action) => ({
            ...action,
            // The registered copy outlives this render, so it reads the closure of the latest one.
            perform: () => latest.current.find((current) => current.id === action.id)?.perform(),
          })),
      ),
    // Re-registers when the set of visible actions changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [register, visibleIds],
  );

  useSyncExternalStore(subscribe, () => null);
};
