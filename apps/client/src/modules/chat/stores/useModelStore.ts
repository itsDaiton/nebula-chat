import { create } from 'zustand';
import type { ModelState } from '@/modules/chat/types/types';

export const useModelStore = create<ModelState>((set) => ({
  selectedModel: 'gpt-4o-mini',
  setSelectedModel: (selectedModel) =>
    set((state) => ({
      selectedModel:
        typeof selectedModel === 'function' ? selectedModel(state.selectedModel) : selectedModel,
    })),
}));
