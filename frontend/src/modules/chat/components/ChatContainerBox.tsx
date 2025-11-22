import React from 'react';
import { Flex } from '@chakra-ui/react';

export const ChatContainerBox = ({ children }: { children: React.ReactNode }) => (
  <Flex
    direction="column"
    h="calc(100vh - 120px)"
    maxW="1000px"
    mx="auto"
    bg="bg.default"
    borderWidth={{ base: '1px', _dark: '1.5px' }}
    borderColor="border.default"
    borderRadius="lg"
    position="relative"
    boxShadow={{ base: 'sm', _dark: 'none' }}
  >
    {children}
  </Flex>
);
