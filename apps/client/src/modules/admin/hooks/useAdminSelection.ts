import type { ReactNode } from 'react';
import { useAdminDetailStore } from '@/modules/admin/stores/useAdminDetailStore';
import { usePanelStore } from '@/shared/stores/usePanelStore';

/** The row picked on the page at `path`; picking one opens the right panel, or the bottom sheet on a small screen. */
export const useAdminSelection = (path: string) => {
  const selection = useAdminDetailStore((state) => state.selection);
  const select = useAdminDetailStore((state) => state.select);
  const clear = useAdminDetailStore((state) => state.clear);

  return {
    clear,
    selectedId: selection?.path === path ? selection.id : undefined,
    select: (id: string, title: string, detail: ReactNode) => {
      select({ path, id, title, detail });
      usePanelStore.getState().openRight();
    },
  };
};
