import { create } from 'zustand';
import type { OwnKeyEditState } from '@/modules/settings/types/types';

/** Which provider's stored key is being replaced, if any. */
export const useOwnKeyEditStore = create<OwnKeyEditState>((set) => ({
  editing: null,
  startEditing: (provider) => set({ editing: provider }),
  stopEditing: () => set({ editing: null }),
}));
