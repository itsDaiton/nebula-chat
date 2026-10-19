import { Box, Flex } from '@chakra-ui/react';
import { resources } from '@/resources';
import type { ChatEmptyStateProps } from '@/modules/chat/types/types';

export const ChatEmptyState = ({ sessionId }: ChatEmptyStateProps) => (
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
      {sessionId ? resources.chat.emptySession : resources.chat.welcomeMessage}
    </Box>
    <Box fontSize="md" maxW="600px" lineHeight="tall">
      {sessionId ? resources.chat.emptySessionHint : resources.chat.welcomeIntro}
    </Box>
  </Flex>
);
