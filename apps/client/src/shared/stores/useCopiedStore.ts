import { create } from 'zustand';

type CopiedState = {
  copiedId: string | null;
  setCopiedId: (copiedId: string | null) => void;
};

export const useCopiedStore = create<CopiedState>((set) => ({
  copiedId: null,
  setCopiedId: (copiedId) => set({ copiedId }),
}));
