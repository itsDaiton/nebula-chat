import { Box, Flex } from '@chakra-ui/react';
import type { ChatMessageProps } from '../types/types';
import { useIsUser } from '../utils/chatUtils';
import { ChatIcon } from './ChatIcon';
import { MarkdownContent } from '@/shared/components/ui/markdown-content';

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = useIsUser(message.role);

  return (
    <Flex direction={isUser ? 'row-reverse' : 'row'} gap={4} mb={6} align="flex-start">
      <ChatIcon isUser={isUser} />
      <Box
        maxW="70%"
        bg={isUser ? 'bg.subtle' : 'bg.input'}
        color="fg.soft"
        borderRadius="lg"
        px={4}
        py={3}
        borderWidth={{ base: '1px', _dark: '1.5px' }}
        borderColor="border.default"
      >
        <MarkdownContent content={message.content} />
      </Box>
    </Flex>
  );
};
