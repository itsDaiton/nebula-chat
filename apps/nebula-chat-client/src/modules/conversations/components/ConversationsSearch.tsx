import { Box, Flex, Input, InputGroup, Portal, Text } from '@chakra-ui/react';
import type { ConversationsSearchProps } from '@/modules/conversations/types/types';
import { ConversationListItem } from '@/modules/conversations/components/ConversationListItem';
import { chatScrollBar } from '@/shared/components/scrollbar';
import { useConversationsSearch } from '@/modules/conversations/hooks/useConversationsSearch';
import { useConversationsSearchStore } from '@/modules/conversations/stores/useConversationsSearchStore';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import { resources } from '@/resources';
import { ConversationSkeletons } from '@/modules/conversations/components/ConversationSkeletons';

export const ConversationsSearch = ({
  conversations,
  onConversationClick,
  onClose,
}: ConversationsSearchProps) => {
  const { searchQuery, setSearchQuery, filteredConversations, isSearching, error } =
    useConversationsSearch(conversations);
  const clearResults = useConversationsSearchStore((state) => state.clearResults);

  const closeAndClearResults = () => {
    clearResults();
    onClose();
  };

  const selectConversationAndClearResults = (conversationId: string) => {
    clearResults();
    onConversationClick(conversationId);
  };

  useEscapeKey(closeAndClearResults);

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
        onClick={closeAndClearResults}
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
                  onClick={selectConversationAndClearResults}
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
                  {resources.conversations.searchHint}
                </Box>
              )}
          </Flex>
        </Box>
      </Flex>
    </Portal>
  );
};
