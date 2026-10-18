import { Alert } from '@chakra-ui/react';
import type { AuthFormAlertProps } from '@/modules/auth/types/types';

/** An outcome that belongs to the whole form rather than one field. */
export const AuthFormAlert = ({ message, status = 'error' }: AuthFormAlertProps) =>
  message ? (
    <Alert.Root status={status} role={status === 'error' ? 'alert' : 'status'}>
      <Alert.Indicator />
      <Alert.Title>{message}</Alert.Title>
    </Alert.Root>
  ) : null;
