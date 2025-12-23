import { Box, Flex, Text, Spinner } from '@chakra-ui/react';
import { useConversationsContext } from '../context/ConversationsContext';
import { ConversationListItem } from './ConversationListItem';
import { ConversationsSearch } from './ConversationsSearch';
import { ConversationActionButton } from './ConversationActionButton';
import { SidePanel } from '@/shared/layout/SidePanel';
import { resources } from '@/resources';
import { useState } from 'react';
import { FiEdit, FiSearch } from 'react-icons/fi';
import { useKeyboardShortcut } from '@/shared/hooks/useKeyboardShortcut';
import { useNavigate } from 'react-router';
import { route } from '@/routes';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

export const ConversationsList = () => {
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
  };

  const handleConversationClick = (conversationId: string) => {
    void navigate(route.chat.conversation(conversationId));
    setIsSearchOpen(false);
  };

  if (isLoading) {
    return (
      <SidePanel>
        <Flex h="100%" align="center" justify="center" p={4}>
          <Flex direction="column" align="center">
            <Spinner size="md" color="fg.muted" />
            <Text mt={2} fontSize="sm" color="fg.muted">
              {resources.conversations.loading}
            </Text>
          </Flex>
        </Flex>
      </SidePanel>
    );
  }

  if (error) {
    return (
      <SidePanel>
        <Flex h="100%" align="center" justify="center" p={4}>
          <Text fontSize="sm" color="red.500">
            {error}
          </Text>
        </Flex>
      </SidePanel>
    );
  }

  return (
    <SidePanel>
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
        <ConversationActionButton
          icon={<FiEdit />}
          label="New Chat"
          onClick={handleCreateNewChat}
        />
        <ConversationActionButton
          icon={<FiSearch />}
          label="Search chats"
          onClick={() => setIsSearchOpen(!isSearchOpen)}
        />
      </Flex>
      <Box px={3} py={2}>
        <Text fontSize="sm" fontWeight="medium" color="fg.muted" pl={2}>
          Chats
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
              <Flex justify="center" py={3}>
                <Spinner size="sm" color="fg.muted" />
              </Flex>
            )}
          </Flex>
        )}
      </Box>
    </SidePanel>
  );
};
