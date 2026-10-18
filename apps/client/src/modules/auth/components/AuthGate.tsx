import { Center, Spinner, Text } from '@chakra-ui/react';
import { useSessionBootstrap } from '@/modules/auth/hooks/useSessionBootstrap';
import type { AuthGateProps } from '@/modules/auth/types/types';
import { resources } from '@/resources';

// Every API route 401s without a session, so nothing renders until one exists.
export const AuthGate = ({ children }: AuthGateProps) => {
  const { isPending, isError } = useSessionBootstrap();

  if (isPending) {
    return (
      <Center h="100dvh" role="status" aria-label={resources.auth.loading}>
        <Spinner />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center h="100dvh" role="alert">
        <Text>{resources.auth.sessionFailed}</Text>
      </Center>
    );
  }

  return children;
};
