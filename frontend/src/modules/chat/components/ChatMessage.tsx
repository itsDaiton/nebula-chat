import { Box, Text, Flex } from '@chakra-ui/react';
import type { ChatMessageProps } from '../types/types';
import { useIsUser } from '../utils/chatUtils';
import { ChatIcon } from './ChatIcon';
import { useMultiLine } from '@/shared/hooks/useMultiLine';

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = useIsUser(message.role);
  const { isMultiLine, textRef } = useMultiLine(message.content);

  return (
    <Flex
      direction={isUser ? 'row-reverse' : 'row'}
      gap={4}
      mb={6}
      align={isMultiLine ? 'flex-start' : 'center'}
    >
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
        <Box position="relative" display="inline">
          <Text fontSize="sm" whiteSpace="pre-wrap" as="span" display="inline" ref={textRef}>
            {message.content}
          </Text>
        </Box>
      </Box>
    </Flex>
  );
};
