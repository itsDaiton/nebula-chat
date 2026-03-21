import { create } from 'zustand';

type MultiLineState = {
  multiLineMap: Record<string, boolean>;
  setIsMultiLine: (content: string, value: boolean) => void;
  removeEntry: (content: string) => void;
};

export const useMultiLineStore = create<MultiLineState>((set) => ({
  multiLineMap: {},

  setIsMultiLine: (content, value) =>
    set((state) => ({ multiLineMap: { ...state.multiLineMap, [content]: value } })),

  removeEntry: (content) =>
    set((state) => {
      const { [content]: _removed, ...rest } = state.multiLineMap;
      return { multiLineMap: rest };
    }),
}));
