import { Box, Flex, Text } from '@chakra-ui/react';
import { memo } from 'react';
import type { ChatMessageProps } from '@/modules/chat/types/types';
import { getMessageBg } from '@/modules/chat/utils/getMessageBg';
import { isUser } from '@/modules/chat/utils/isUser';
import { ChatIcon } from '@/modules/chat/components/ChatIcon';
import { MarkdownContent } from '@/shared/components/ui/markdown-content';
import { useMultiLine } from '@/shared/hooks/useMultiLine';
import { resources } from '@/resources';

export const ChatMessage = memo(({ message, waitingRun }: ChatMessageProps) => {
  const isUserMessage = isUser(message.role);
  const { isMultiLine, textRef } = useMultiLine(message.content);

  return (
    <Flex direction={isUserMessage ? 'row-reverse' : 'row'} gap={4} mb={6} align="flex-start">
      <ChatIcon isUser={isUserMessage} />
      <Box
        ref={isUserMessage ? textRef : undefined}
        maxW={isUserMessage && !isMultiLine ? 'fit-content' : { base: '100%', md: '70%' }}
        bg={getMessageBg(isUserMessage)}
        color="fg.soft"
        borderRadius="lg"
        px={4}
        py={3}
        borderWidth={{ base: '1px', _dark: '1.5px' }}
        borderColor="border.default"
      >
        {message.clarifying && (
          <Text fontSize="xs" fontWeight="semibold" color="fg.muted" mb={1}>
            {resources.chat.clarifying.label}
          </Text>
        )}
        <MarkdownContent content={message.content} />
        {message.clarifying && waitingRun && (
          <>
            <Text fontSize="xs" color="fg.muted" mt={2}>
              {resources.chat.clarifying.note}
            </Text>
            <Text fontSize="xs" color="fg.muted" mt={1}>
              {resources.chat.clarifying.progress(waitingRun.stepsCompleted)}
            </Text>
          </>
        )}
      </Box>
    </Flex>
  );
});

ChatMessage.displayName = 'ChatMessage';
