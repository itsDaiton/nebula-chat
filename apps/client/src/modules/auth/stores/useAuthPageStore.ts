import { create } from 'zustand';
import type { AuthPageState } from '@/modules/auth/types/types';

const initialState = {
  form: 'sign-in',
  outcome: null,
  twoFactorMethod: 'totp',
  emailPendingDeletion: false,
} satisfies Partial<AuthPageState>;

export const useAuthPageStore = create<AuthPageState>((set) => ({
  ...initialState,
  showSignIn: () => set({ form: 'sign-in', emailPendingDeletion: false }),
  showSignUp: () => set({ form: 'sign-up', emailPendingDeletion: false }),
  showOutcome: (outcome) => set({ outcome, twoFactorMethod: 'totp' }),
  toggleTwoFactorMethod: () =>
    set((state) => ({ twoFactorMethod: state.twoFactorMethod === 'totp' ? 'backup' : 'totp' })),
  markEmailPendingDeletion: () => set({ emailPendingDeletion: true }),
  reset: () => set(initialState),
}));
