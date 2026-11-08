import { create } from 'zustand';

type SessionTitleEditState = {
  editingSessionId: string | null;
  startEditing: (sessionId: string) => void;
  stopEditing: () => void;
};

// Keyed by Session so opening another one never inherits an edit left open.
export const useSessionTitleEditStore = create<SessionTitleEditState>((set) => ({
  editingSessionId: null,
  startEditing: (editingSessionId) => set({ editingSessionId }),
  stopEditing: () => set({ editingSessionId: null }),
}));
