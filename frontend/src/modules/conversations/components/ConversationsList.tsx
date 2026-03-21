import { useNavigate } from 'react-router';
import { Box, Flex, Text, Spinner } from '@chakra-ui/react';
import { toaster } from '@/shared/components/ui/toaster';
import { useConversationsContext } from '@/modules/conversations/context/ConversationsContext';
import { ConversationListItem } from '@/modules/conversations/components/ConversationListItem';
import { ConversationsSearch } from '@/modules/conversations/components/ConversationsSearch';
import { SidePanel } from '@/shared/components/layout/SidePanel';
import { resources } from '@/resources';
import { useKeyboardShortcut } from '@/shared/hooks/useKeyboardShortcut';
import { useSearchStore } from '@/shared/stores/useSearchStore';
import { route } from '@/routing/routes';
import { useInfiniteScroll } from '@/modules/conversations/hooks/useInfiniteScroll';
import { chatScrollBar } from '@/shared/components/scrollbar';
import { BadgeActionButton } from '@/shared/components/navigation/BadgeActionButton';
import type { NavigationAction } from '@/shared/types/types';
import { navigationActions } from '@/modules/conversations/utils/navigationActions';
import { ConversationSkeletons } from '@/modules/conversations/components/ConversationSkeletons';
import type { ConversationsListProps } from '@/modules/conversations/types/types';

export const ConversationsList = ({
  onClose,
  inDrawer = false,
  toggleSearch: externalToggleSearch,
  closeSearch: externalCloseSearch,
}: ConversationsListProps = {}) => {
  const { conversations, isLoading, isLoadingMore, error, hasMore, loadMore } =
    useConversationsContext();
  const {
    isSearchOpen: storeIsSearchOpen,
    openSearch,
    closeSearch: storeCloseSearch,
    toggleSearch,
  } = useSearchStore();
  const navigate = useNavigate();

  const isSearchOpen = inDrawer ? false : storeIsSearchOpen;
  const closeSearch = inDrawer ? (externalCloseSearch ?? (() => {})) : storeCloseSearch;

  const observerTarget = useInfiniteScroll({
    hasMore,
    isLoading: isLoadingMore,
    onLoadMore: loadMore,
  });

  useKeyboardShortcut(
    'k',
    () => {
      if (inDrawer && externalToggleSearch) {
        externalToggleSearch();
      } else {
        openSearch();
      }
    },
    { ctrl: true },
  );

  const handleCreateNewChat = () => {
    void navigate(route.chat.root());
    closeSearch();
    onClose?.();
  };

  const handleActionClick = (action: NavigationAction['action']) => {
    switch (action) {
      case 'newChat':
        handleCreateNewChat();
        break;
      case 'search':
        if (inDrawer) {
          onClose?.();
          externalToggleSearch?.();
        } else {
          toggleSearch();
        }
        break;
      case 'files':
      case 'aiStudio':
        closeSearch();
        onClose?.();
        toaster.create({
          title: 'Coming Soon',
          description: 'This section is currently under development.',
          type: 'info',
          duration: 3000,
        });
        break;
    }
  };

  const handleConversationClick = (conversationId: string) => {
    void navigate(route.chat.conversation(conversationId));
    closeSearch();
    onClose?.();
  };

  if (error) {
    const errorContent = (
      <Flex h="100%" align="center" justify="center" p={4}>
        <Text
          fontSize="sm"
          color="red.500"
          wordBreak="break-word"
          overflowWrap="break-word"
          maxW="100%"
          textAlign="center"
        >
          {error}
        </Text>
      </Flex>
    );
    return inDrawer ? errorContent : <SidePanel>{errorContent}</SidePanel>;
  }

  const content = (
    <>
      {isSearchOpen && (
        <ConversationsSearch
          conversations={conversations}
          onConversationClick={handleConversationClick}
          onClose={closeSearch}
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
        {isLoading && <ConversationSkeletons />}
        {!isLoading && conversations.length === 0 && (
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
        )}
        {!isLoading && conversations.length > 0 && (
          <Flex direction="column" gap={1}>
            {conversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                onClick={handleConversationClick}
              />
            ))}
            <div ref={observerTarget} style={{ height: '0px' }} />
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
