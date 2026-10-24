import { Center, Spinner } from '@chakra-ui/react';
import { resources } from '@/resources';

export const SessionPending = () => (
  <Center h="100dvh" role="status" aria-label={resources.auth.loading}>
    <Spinner />
  </Center>
);
