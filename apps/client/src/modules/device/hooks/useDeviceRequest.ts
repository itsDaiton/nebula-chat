import { useQuery } from '@tanstack/react-query';
import { authClient } from '@/libs/auth/client';
import { runAuthRequest } from '@/modules/auth/utils/runAuthRequest';
import type { DeviceRequest } from '@/modules/device/types/types';

/** The device code behind `userCode`; reading it claims the code for this Admin. */
export const useDeviceRequest = (userCode: string) =>
  useQuery({
    queryKey: ['auth', 'device', userCode],
    queryFn: async () => {
      const { data } = await runAuthRequest(() =>
        authClient.$fetch<DeviceRequest>('/device', { query: { user_code: userCode } }),
      );
      return data;
    },
    // The server allows five reads per code lifetime, so nothing refetches behind the Admin's back.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
    meta: { inlineError: true },
  });
