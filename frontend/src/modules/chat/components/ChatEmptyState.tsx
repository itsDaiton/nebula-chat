import { Box, Flex } from '@chakra-ui/react';
import { resources } from '@/resources';
import type { ChatEmptyStateProps } from '@/modules/chat/types/types';

export const ChatEmptyState = ({ conversationId }: ChatEmptyStateProps) => (
  <Flex
    direction="column"
    align="center"
    justify="center"
    h="100%"
    textAlign="center"
    color="fg.muted"
    gap={4}
  >
    <Box fontSize="2xl" fontWeight="medium" color="fg.default" maxW="600px">
      {conversationId ? resources.chat.emptyConversation : resources.chat.welcomeMessage}
    </Box>
    <Box fontSize="md" maxW="600px" lineHeight="tall">
      {conversationId ? resources.chat.emptyConversationHint : resources.chat.welcomeIntro}
    </Box>
  </Flex>
);
