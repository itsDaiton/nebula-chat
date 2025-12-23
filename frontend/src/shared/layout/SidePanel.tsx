import { Flex } from '@chakra-ui/react';
import type { SidePanelProps } from '../types/types';

export const SidePanel = ({ children }: SidePanelProps) => (
  <Flex
    direction="column"
    h="calc(100vh - 130px)"
    flex="0 0 calc(20% - 16px)"
    bg="bg.default"
    borderColor="border.default"
    borderWidth="1px"
    borderRadius="lg"
    boxShadow="none"
  >
    {children}
  </Flex>
);
