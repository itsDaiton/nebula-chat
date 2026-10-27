import React from 'react';
import { Flex } from '@chakra-ui/react';

export const ChatContainerBox = ({ children }: { children: React.ReactNode }) => (
  <Flex direction="column" h="100%" w="100%" position="relative" overflow="hidden">
    {children}
  </Flex>
);
