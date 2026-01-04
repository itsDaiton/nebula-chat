import { Box, Flex } from '@chakra-ui/react';
import { Header } from './Header';
import { ConversationsList } from '@/modules/conversations/components/ConversationsList';
import { SidePanel } from './SidePanel';
import type { LayoutProps } from '@/shared/types/types';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { ConversationDrawer } from '@/modules/conversations/components/ConversationDrawer';
import { useDrawer } from '../hooks/useDrawer';
import { ConversationsSearch } from '@/modules/conversations/components/ConversationsSearch';
import { useConversationsContext } from '@/modules/conversations/context/ConversationsContext';
import { useNavigate } from 'react-router';
import { route } from '@/routes';
import { useViewportHeight } from '../hooks/useViewportHeight';

export const Layout = ({ children }: LayoutProps) => {
  const { isDrawerOpen, openDrawer, closeDrawer, isSearchOpen, toggleSearch, closeSearch } =
    useDrawer();
  const { showSidePanels, showRightPanel } = useResponsiveLayout();
  const { conversations } = useConversationsContext();
  const navigate = useNavigate();
  const viewportHeight = useViewportHeight();

  const handleConversationClick = (conversationId: string) => {
    void navigate(route.chat.conversation(conversationId));
    closeSearch();
  };

  return (
    <Flex direction="column" h={viewportHeight} style={{ height: viewportHeight }}>
      <Header onMenuClick={openDrawer} />
      {!showSidePanels && isSearchOpen && (
        <ConversationsSearch
          conversations={conversations}
          onConversationClick={handleConversationClick}
          onClose={closeSearch}
        />
      )}
      <Flex
        as="main"
        flex="1"
        mt={{ base: '64px', lg: '80px' }}
        gap={{ base: 0, lg: 4 }}
        pt={{ base: 8, lg: 6 }}
        px={{ base: 4, lg: 0 }}
        justifyContent="center"
        overflow="hidden"
      >
        {showSidePanels && <ConversationsList />}
        {!showSidePanels && (
          <ConversationDrawer
            isDrawerOpen={isDrawerOpen}
            closeDrawer={closeDrawer}
            toggleSearch={toggleSearch}
            closeSearch={closeSearch}
          />
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
