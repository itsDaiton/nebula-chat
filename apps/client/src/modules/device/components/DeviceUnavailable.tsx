import { AuthStatus } from '@/modules/auth/components/AuthStatus';
import type { DeviceUnavailableProps } from '@/modules/device/types/types';
import { resources } from '@/resources';

/** Why this code cannot be approved here: who is signed in, or the state of the code. */
export const DeviceUnavailable = ({ message }: DeviceUnavailableProps) => (
  <AuthStatus title={resources.device.unavailableTitle} status="error" message={message} />
);
