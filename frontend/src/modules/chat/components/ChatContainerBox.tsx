import React from 'react';
import { Flex } from '@chakra-ui/react';

export const ChatContainerBox = ({ children }: { children: React.ReactNode }) => (
  <Flex
    direction="column"
    h="calc(100vh - 130px)"
    w="100%"
    bg="bg.default"
    borderColor={'border.default'}
    borderWidth={'1px'}
    borderRadius="lg"
    position="relative"
    boxShadow="none"
  >
    {children}
  </Flex>
);
