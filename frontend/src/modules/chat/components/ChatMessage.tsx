import { Box, Flex } from '@chakra-ui/react';
import { memo } from 'react';
import type { ChatMessageProps } from '@/modules/chat/types/types';
import { getMessageBg } from '@/modules/chat/utils/getMessageBg';
import { isUser } from '@/modules/chat/utils/isUser';
import { ChatIcon } from '@/modules/chat/components/ChatIcon';
import { MarkdownContent } from '@/shared/components/ui/markdown-content';

export const ChatMessage = memo(({ message }: ChatMessageProps) => {
  const isUserMessage = isUser(message.role);

  return (
    <Flex direction={isUserMessage ? 'row-reverse' : 'row'} gap={4} mb={6} align="flex-start">
      <ChatIcon isUser={isUserMessage} />
      <Box
        maxW={{ base: '100%', md: '70%' }}
        bg={getMessageBg(isUserMessage)}
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
