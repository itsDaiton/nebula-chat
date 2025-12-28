import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Box, Flex, Text, Spinner } from '@chakra-ui/react';
import { useConversationsContext } from '../context/ConversationsContext';
import { ConversationListItem } from './ConversationListItem';
import { ConversationsSearch } from './ConversationsSearch';
import { SidePanel } from '@/shared/layout/SidePanel';
import { resources } from '@/resources';
import { useKeyboardShortcut } from '@/shared/hooks/useKeyboardShortcut';
import { route } from '@/routes';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { chatScrollBar } from '@/shared/components/scrollbar';
import { BadgeActionButton } from '@/shared/components/navigation/BadgeActionButton';
import type { NavigationAction } from '@/shared/types/types';
import { navigationActions } from '../utils/navigationActions';

interface ConversationsListProps {
  onNavigate?: () => void;
  inDrawer?: boolean;
}

export const ConversationsList = ({
  onNavigate,
  inDrawer = false,
}: ConversationsListProps = {}) => {
  const { conversations, isLoading, isLoadingMore, error, hasMore, loadMore } =
    useConversationsContext();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const navigate = useNavigate();

  const observerTarget = useInfiniteScroll({
    hasMore,
    isLoading: isLoadingMore,
    onLoadMore: loadMore,
  });

  useKeyboardShortcut('k', () => setIsSearchOpen(true), { ctrl: true });

  const handleCreateNewChat = () => {
    void navigate(route.chat.root());
    onNavigate?.();
  };

  const handleActionClick = (action: NavigationAction['action']) => {
    switch (action) {
      case 'newChat':
        handleCreateNewChat();
        break;
      case 'search':
        setIsSearchOpen(!isSearchOpen);
        break;
      case 'files':
      case 'aiStudio':
        alert('coming soon');
        break;
    }
  };

  const handleConversationClick = (conversationId: string) => {
    void navigate(route.chat.conversation(conversationId));
    setIsSearchOpen(false);
    onNavigate?.();
  };

  const loadingContent = (
    <Flex h="100%" align="center" justify="center" p={4}>
      <Flex direction="column" align="center">
        <Spinner size="md" color="fg.muted" />
        <Text mt={2} fontSize="sm" color="fg.muted">
          {resources.conversations.loading}
        </Text>
      </Flex>
    </Flex>
  );

  if (isLoading) {
    return inDrawer ? loadingContent : <SidePanel>{loadingContent}</SidePanel>;
  }

  const errorContent = (
    <Flex h="100%" align="center" justify="center" p={4}>
      <Text fontSize="sm" color="red.500">
        {error}
      </Text>
    </Flex>
  );

  if (error) {
    return inDrawer ? errorContent : <SidePanel>{errorContent}</SidePanel>;
  }

  const content = (
    <>
      {isSearchOpen && (
        <ConversationsSearch
          conversations={conversations}
          onConversationClick={handleConversationClick}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
      <Flex
        direction="column"
        gap={2}
        p={3}
        borderBottom="1px"
        borderColor="border.default"
        position="sticky"
        top={0}
        bg="bg.default"
        zIndex={1}
      >
        {navigationActions.map((action) => (
          <BadgeActionButton
            key={action.id}
            icon={action.icon}
            label={action.label}
            onClick={() => handleActionClick(action.action)}
            badge={action.badge}
          />
        ))}
      </Flex>
      <Box px={3} py={2}>
        <Text fontSize="sm" fontWeight="medium" color="fg.muted" pl={2}>
          Chat History
        </Text>
      </Box>
      <Box px={2} pb={2}>
        {conversations.length === 0 ? (
          <Flex
            direction="column"
            align="center"
            justify="center"
            minH="200px"
            textAlign="center"
            color="fg.muted"
            px={4}
          >
            <Text fontSize="sm">{resources.conversations.empty}</Text>
            <Text fontSize="xs" mt={2}>
              {resources.conversations.emptyHint}
            </Text>
          </Flex>
        ) : (
          <Flex direction="column" gap={1}>
            {conversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                onClick={handleConversationClick}
              />
            ))}
            <div ref={observerTarget} style={{ height: '20px' }} />
            {isLoadingMore && (
              <Flex justify="center" align="center" direction="column" py={3}>
                <Spinner size="sm" color="fg.muted" />
                <Text mt={2} fontSize="sm" color="fg.muted">
                  {resources.conversations.loadingMore}
                </Text>
              </Flex>
            )}
          </Flex>
        )}
      </Box>
    </>
  );

  if (inDrawer) {
    return (
      <Flex direction="column" h="100%" bg="bg.default" overflowY="auto" css={chatScrollBar}>
        {content}
      </Flex>
    );
  }

  return <SidePanel>{content}</SidePanel>;
};
