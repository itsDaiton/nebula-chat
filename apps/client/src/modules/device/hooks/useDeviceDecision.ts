import { useMutation } from '@tanstack/react-query';
import { authClient } from '@/libs/auth/client';
import { runAuthRequest } from '@/modules/auth/utils/runAuthRequest';
import type { DeviceDecision } from '@/modules/device/types/types';

/** Approves or denies the device code; the CLI's next poll sees the answer. */
export const useDeviceDecision = (userCode: string) =>
  useMutation({
    mutationFn: (decision: DeviceDecision) =>
      runAuthRequest(() =>
        authClient.$fetch(`/device/${decision}`, { method: 'POST', body: { userCode } }),
      ),
    meta: { inlineError: true },
  });
