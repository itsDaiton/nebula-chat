import { Box, Text, Flex, Circle, Icon } from '@chakra-ui/react';
import type { ChatMessageProps } from '../types/types';
import { IoSparkles } from 'react-icons/io5';
import { LuUser } from 'react-icons/lu';
import { useMultiLine } from '../hooks/useMultiLine';
import { useIsUser } from '../utils/chatUtils';

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
      <Circle
        size="10"
        bg={isUser ? 'bg.subtle' : 'bg.input'}
        color="fg.soft"
        borderWidth={{ base: '1px', _dark: '1.5px' }}
        borderColor="border.default"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        <Icon
          as={isUser ? LuUser : IoSparkles}
          boxSize="5"
          position="relative"
          left="0.5px"
          top="0.5px"
        />
      </Circle>
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
