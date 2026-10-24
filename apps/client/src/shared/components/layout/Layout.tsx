import { useEffect } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { Header } from '@/shared/components/layout/Header';
import { SessionsList } from '@/modules/sessions/components/SessionsList';
import { SidePanel } from '@/shared/components/layout/SidePanel';
import type { LayoutProps } from '@/shared/types/types';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { SessionDrawer } from '@/modules/sessions/components/SessionDrawer';
import { useDrawer } from '@/shared/hooks/useDrawer';
import { SessionsSearch } from '@/modules/sessions/components/SessionsSearch';
import { useSessions } from '@/modules/sessions/hooks/useSessions';
import { useNavigate } from '@tanstack/react-router';
import { useViewportHeight } from '@/shared/hooks/useViewportHeight';

export const Layout = ({ children }: LayoutProps) => {
  const { isDrawerOpen, openDrawer, closeDrawer, isSearchOpen, toggleSearch, closeSearch } =
    useDrawer();
  const { showSidePanels, showRightPanel } = useResponsiveLayout();
  const { sessions } = useSessions();

  useEffect(() => {
    if (showSidePanels && isSearchOpen) {
      closeSearch();
    }
    // Only run when layout switches to desktop — not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSidePanels]);
  const navigate = useNavigate();
  const viewportHeight = useViewportHeight();

  const handleSessionClick = (sessionId: string) => {
    void navigate({ to: '/s/$id', params: { id: sessionId } });
    closeSearch();
  };

  return (
    <Flex direction="column" style={{ height: viewportHeight }}>
      <Header onMenuClick={openDrawer} />
      {!showSidePanels && isSearchOpen && (
        <SessionsSearch
          sessions={sessions}
          onSessionClick={handleSessionClick}
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
        {showSidePanels && <SessionsList />}
        {!showSidePanels && (
          <SessionDrawer
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
