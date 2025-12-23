import { Box, Flex, Text, Spinner } from '@chakra-ui/react';
import { useConversations } from '../hooks/useConversations';
import { ConversationListItem } from './ConversationListItem';
import { chatScrollBar } from '@/shared/components/scrollbar';
import { SidePanel } from '@/shared/layout/SidePanel';
import { resources } from '@/resources';

export const ConversationsList = () => {
  const { conversations, isLoading, error } = useConversations();

  // TODO: Navigate to conversation route - to be implemented

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
      <Box p={4} borderBottom="1px" borderColor="border.default">
        <Text fontSize="lg" fontWeight="semibold" color="fg.default">
          {resources.conversations.title}
        </Text>
      </Box>

      <Box flex="1" overflowY="auto" p={2} css={chatScrollBar}>
        {conversations.length === 0 ? (
          <Flex
            direction="column"
            align="center"
            justify="center"
            h="100%"
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
                onClick={() => alert(conversation.id)}
              />
            ))}
          </Flex>
        )}
      </Box>
    </SidePanel>
  );
};
