import { Box, Text, Flex, Circle, Icon } from '@chakra-ui/react';
import type { ChatMessageProps } from '../types/types';
import { IoSparkles } from 'react-icons/io5';
import { LuUser } from 'react-icons/lu';
import { useEffect, useRef, useState } from 'react';
import { keyframes } from '@emotion/react'; // Add missing keyframes import

const cursorBlink = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0; }
  100% { opacity: 1; }
`;

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  const [isMultiLine, setIsMultiLine] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseInt(getComputedStyle(textRef.current).lineHeight);
      const height = textRef.current.offsetHeight;
      setIsMultiLine(height > lineHeight * 1.5);
    }
  }, [message.content]);

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
          <Text ref={textRef} fontSize="sm" whiteSpace="pre-wrap" as="span" display="inline">
            {message.content}
            {!isUser && message.role === 'assistant' && (
              <Box
                as="span"
                display="inline-block"
                w="2px"
                h="1.2em"
                bg="fg.soft"
                ml="1px"
                verticalAlign="middle"
                animation={`${cursorBlink} 1s infinite`}
              />
            )}
          </Text>
        </Box>
      </Box>
    </Flex>
  );
};
