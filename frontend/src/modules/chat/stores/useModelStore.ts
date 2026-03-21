import { create } from 'zustand';
import type { Dispatch, SetStateAction } from 'react';

interface ModelState {
  selectedModel: string;
  setSelectedModel: Dispatch<SetStateAction<string>>;
}

export const useModelStore = create<ModelState>((set) => ({
  selectedModel: 'gpt-4o-mini',
  setSelectedModel: (selectedModel) =>
    set((state) => ({
      selectedModel:
        typeof selectedModel === 'function' ? selectedModel(state.selectedModel) : selectedModel,
    })),
}));
