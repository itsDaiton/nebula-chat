import { create } from 'zustand';
import type { PasswordChangeState } from '@/modules/settings/types/types';

export const usePasswordChangeStore = create<PasswordChangeState>((set) => ({
  isPasswordFormOpen: false,
  togglePasswordForm: () => set((state) => ({ isPasswordFormOpen: !state.isPasswordFormOpen })),
  closePasswordForm: () => set({ isPasswordFormOpen: false }),
}));
