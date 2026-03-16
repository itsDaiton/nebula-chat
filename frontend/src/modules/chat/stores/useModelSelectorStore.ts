import { create } from 'zustand';

interface ModelSelectorState {
  isSelectOpen: boolean;
  triggerWidth: number;
  setIsSelectOpen: (isOpen: boolean) => void;
  setTriggerWidth: (width: number) => void;
}

export const useModelSelectorStore = create<ModelSelectorState>((set) => ({
  isSelectOpen: false,
  triggerWidth: 120,
  setIsSelectOpen: (isOpen) => set({ isSelectOpen: isOpen }),
  setTriggerWidth: (width) => set({ triggerWidth: width }),
}));
