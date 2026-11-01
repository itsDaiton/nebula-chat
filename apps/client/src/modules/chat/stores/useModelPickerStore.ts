import { create } from 'zustand';
import type { ModelPickerState } from '@/modules/chat/types/types';

export const useModelPickerStore = create<ModelPickerState>((set) => ({
  isOpen: false,
  search: '',
  // A reopened picker starts unfiltered.
  setOpen: (isOpen) => set(isOpen ? { isOpen } : { isOpen, search: '' }),
  setSearch: (search) => set({ search }),
}));
