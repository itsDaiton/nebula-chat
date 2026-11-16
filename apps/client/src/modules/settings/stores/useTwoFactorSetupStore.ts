import { create } from 'zustand';
import type { TwoFactorSetupState } from '@/modules/settings/types/types';

export const useTwoFactorSetupStore = create<TwoFactorSetupState>((set) => ({
  step: { name: 'idle' },
  code: '',
  setStep: (step) => set({ step }),
  setCode: (code) => set({ code }),
  reset: () => set({ step: { name: 'idle' }, code: '' }),
}));
