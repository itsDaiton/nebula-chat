import { Alert } from '@chakra-ui/react';
import type { AuthFormAlertProps } from '@/modules/auth/types/types';

export const AuthFormAlert = ({ error }: AuthFormAlertProps) =>
  error ? (
    <Alert.Root status="error" role="alert">
      <Alert.Indicator />
      <Alert.Title>{error.message}</Alert.Title>
    </Alert.Root>
  ) : null;
