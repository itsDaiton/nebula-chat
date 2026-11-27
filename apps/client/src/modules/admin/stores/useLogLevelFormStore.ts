import { create } from 'zustand';
import type { LogLevelFormState } from '@/modules/admin/types/types';

const initial = { service: 'server', target: 'root', level: 'debug', ttlSeconds: 900 } as const;

export const useLogLevelFormStore = create<LogLevelFormState>((set) => ({
  ...initial,
  chooseService: (service) => set({ service }),
  chooseTarget: (target) => set({ target }),
  chooseLevel: (level) => set({ level }),
  chooseTtl: (ttlSeconds) => set({ ttlSeconds }),
  reset: () => set(initial),
}));
