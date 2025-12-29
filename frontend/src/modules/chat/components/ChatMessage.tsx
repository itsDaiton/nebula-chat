import { Box, Flex } from '@chakra-ui/react';
import { memo } from 'react';
import type { ChatMessageProps } from '../types/types';
import { useIsUser } from '../utils/chatUtils';
import { ChatIcon } from './ChatIcon';
import { MarkdownContent } from '@/shared/components/ui/markdown-content';

export const ChatMessage = memo(({ message }: ChatMessageProps) => {
  const isUser = useIsUser(message.role);

  return (
    <Flex direction={isUser ? 'row-reverse' : 'row'} gap={4} mb={6} align="flex-start">
      <ChatIcon isUser={isUser} />
      <Box
        maxW={{ base: '100%', md: '70%' }}
        bg={
          isUser
            ? { base: 'bg.subtle', _dark: 'bg.muted' }
            : { base: 'bg.input', _dark: 'bg.subtle' }
        }
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
});

ChatMessage.displayName = 'ChatMessage';
