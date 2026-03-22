import type { OS } from '@/shared/types/types';

export const useOS = (): OS => {
  const platform =
    (navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData?.platform ??
    navigator.userAgent;
  const isMac = /Mac|iPhone|iPad|iPod/i.test(platform);
  return isMac ? 'mac' : 'windows';
};
