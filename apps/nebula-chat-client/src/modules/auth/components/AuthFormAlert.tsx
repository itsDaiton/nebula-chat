import { Alert } from '@chakra-ui/react';
import type { AuthFormAlertProps } from '@/modules/auth/types/types';

/** A failure that belongs to the whole form rather than one field. */
export const AuthFormAlert = ({ message }: AuthFormAlertProps) =>
  message ? (
    <Alert.Root status="error" role="alert">
      <Alert.Indicator />
      <Alert.Title>{message}</Alert.Title>
    </Alert.Root>
  ) : null;
