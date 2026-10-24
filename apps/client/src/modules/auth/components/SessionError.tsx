import { Center, Text } from '@chakra-ui/react';
import { resources } from '@/resources';

export const SessionError = () => (
  <Center h="100dvh" role="alert">
    <Text>{resources.auth.sessionFailed}</Text>
  </Center>
);
