import { create } from 'zustand';

type SessionTitleEditState = {
  editing: boolean;
  startEditing: () => void;
  stopEditing: () => void;
};

export const useSessionTitleEditStore = create<SessionTitleEditState>((set) => ({
  editing: false,
  startEditing: () => set({ editing: true }),
  stopEditing: () => set({ editing: false }),
}));
