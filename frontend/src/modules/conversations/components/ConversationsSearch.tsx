import { Box, Flex, Input, InputGroup, Portal, Text } from '@chakra-ui/react';
import { useEffect } from 'react';
import type { ConversationsSearchProps } from '../types/types';
import { ConversationListItem } from './ConversationListItem';
import { chatScrollBar } from '@/shared/components/scrollbar';
import { useConversationsSearch } from '../hooks/useConversationsSearch';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import { useSearchStore } from '@/shared/stores/useSearchStore';
import { resources } from '@/resources';
import { ConversationSkeletons } from './ConversationSkeletons';

export const ConversationsSearch = ({
  conversations,
  onConversationClick,
  onClose,
}: ConversationsSearchProps) => {
  const { searchQuery, setSearchQuery, filteredConversations, isSearching, error } =
    useConversationsSearch(conversations);
  const { setIsSearchOpen } = useSearchStore();

  useEffect(() => {
    setIsSearchOpen(true);
    return () => setIsSearchOpen(false);
  }, [setIsSearchOpen]);

  useEscapeKey(onClose);

  return (
    <Portal>
      <Box
        position="fixed"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bg="blackAlpha.600"
        zIndex="modal"
        onClick={onClose}
      />
      <Flex
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        zIndex="modal"
        w="600px"
        maxW="90vw"
        maxH="600px"
        direction="column"
        bg="bg.default"
        borderColor="border.default"
        borderWidth="1px"
        borderRadius="lg"
        boxShadow="lg"
        overflow="hidden"
      >
        <Box p={4}>
          <InputGroup>
            <Input
              placeholder={resources.conversations.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              size="md"
              borderColor="border.default"
            />
          </InputGroup>
        </Box>

        <Box flex="1" overflowY="auto" px={4} pb={4} css={chatScrollBar}>
          <Flex direction="column" gap={1}>
            {error && (
              <Box py={8} textAlign="center">
                <Text fontSize="sm" color="red.500">
                  {error}
                </Text>
              </Box>
            )}
            {!error && isSearching && <ConversationSkeletons count={3} />}
            {!error &&
              !isSearching &&
              filteredConversations.length > 0 &&
              filteredConversations.map((conversation) => (
                <ConversationListItem
                  key={conversation.id}
                  conversation={conversation}
                  onClick={onConversationClick}
                />
              ))}
            {!error && !isSearching && filteredConversations.length === 0 && searchQuery.trim() && (
              <Box py={8} textAlign="center" color="fg.muted">
                {resources.conversations.noResults}
              </Box>
            )}
            {!error &&
              !isSearching &&
              filteredConversations.length === 0 &&
              !searchQuery.trim() && (
                <Box py={8} textAlign="center" color="fg.muted" fontSize="sm">
                  Start typing to search all conversations
                </Box>
              )}
          </Flex>
        </Box>
      </Flex>
    </Portal>
  );
};
