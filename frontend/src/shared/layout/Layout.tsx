import { Box, Flex } from '@chakra-ui/react';
import { Header } from './Header';
import { ConversationsList } from '@/modules/conversations/components/ConversationsList';
import { SidePanel } from './SidePanel';
import type { LayoutProps } from '@/shared/types/types';
import { useState } from 'react';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { ConversationDrawer } from '@/modules/conversations/components/ConversationDrawer';

export const Layout = ({ children }: LayoutProps) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { showSidePanels, showRightPanel } = useResponsiveLayout();

  const handleDrawerOpen = () => setIsDrawerOpen(true);

  return (
    <Flex direction="column" minHeight="100vh">
      <Header onMenuClick={handleDrawerOpen} />
      <Flex
        as="main"
        flex="1"
        mt="20"
        gap={{ base: 0, lg: 4 }}
        pt={{ base: 4, lg: 6 }}
        px={{ base: 4, lg: 0 }}
        justifyContent="center"
      >
        {showSidePanels && <ConversationsList />}
        {!showSidePanels && (
          <ConversationDrawer isDrawerOpen={isDrawerOpen} setIsDrawerOpen={setIsDrawerOpen} />
        )}
        <Box
          flex={{ base: '1', lg: '0 0 calc(75% - 16px)', xl: '0 0 calc(60% - 32px)' }}
          maxW={{ base: '100%', lg: 'calc(75% - 16px)', xl: 'calc(60% - 32px)' }}
          w="100%"
        >
          {children}
        </Box>
        {showRightPanel && <SidePanel />}
      </Flex>
    </Flex>
  );
};
