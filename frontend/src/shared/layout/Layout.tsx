import { Box, Flex } from '@chakra-ui/react';
import { Header } from './Header';
import { ConversationsList } from '@/modules/conversations/components/ConversationsList';
import { SidePanel } from './SidePanel';
import type { LayoutProps } from '@/shared/types/types';

export const Layout = ({ children }: LayoutProps) => (
  <Flex direction="column" minHeight="100vh">
    <Header />
    <Flex as="main" flex="1" mt="20" gap={4} pt={6} justifyContent="center">
      <ConversationsList />
      <Box flex="0 0 calc(60% - 32px)">{children}</Box>
      <SidePanel />
    </Flex>
  </Flex>
);
