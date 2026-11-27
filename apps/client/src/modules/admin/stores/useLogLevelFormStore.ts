import { create } from 'zustand';
import type { LogLevelFormState } from '@/modules/admin/types/types';

export const useLogLevelFormStore = create<LogLevelFormState>((set) => ({
  service: 'server',
  target: 'root',
  level: 'debug',
  ttlSeconds: 900,
  setService: (service) => set({ service }),
  setTarget: (target) => set({ target }),
  setLevel: (level) => set({ level }),
  setTtl: (ttlSeconds) => set({ ttlSeconds }),
}));
