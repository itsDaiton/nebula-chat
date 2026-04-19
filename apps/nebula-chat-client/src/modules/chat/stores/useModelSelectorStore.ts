import { create } from 'zustand';
import type { ModelSelectorState } from '@/modules/chat/types/types';

export const useModelSelectorStore = create<ModelSelectorState>((set) => ({
  isSelectOpen: false,
  triggerWidth: 120,
  setIsSelectOpen: (isOpen) => set({ isSelectOpen: isOpen }),
  setTriggerWidth: (width) => set({ triggerWidth: width }),
}));
