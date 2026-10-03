import { create } from 'zustand';
import type { PasswordVisibilityState } from '@/modules/auth/types/types';

export const usePasswordVisibilityStore = create<PasswordVisibilityState>((set) => ({
  isPasswordVisible: false,
  togglePasswordVisibility: () => set((state) => ({ isPasswordVisible: !state.isPasswordVisible })),
  hidePassword: () => set({ isPasswordVisible: false }),
}));
