import { create } from 'zustand';
import type { PasswordVisibilityState } from '@/modules/auth/types/types';

export const usePasswordVisibilityStore = create<PasswordVisibilityState>((set) => ({
  visibleFields: {},
  togglePasswordVisibility: (field) =>
    set((state) => ({
      visibleFields: { ...state.visibleFields, [field]: !state.visibleFields[field] },
    })),
  hidePassword: () => set({ visibleFields: {} }),
}));
