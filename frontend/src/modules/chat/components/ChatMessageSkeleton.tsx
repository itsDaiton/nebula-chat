import { Box, Flex, Skeleton } from '@chakra-ui/react';
import type { ChatMessageSkeletonProps } from '../types/types';

export const ChatMessageSkeleton = ({ isUser = false }: ChatMessageSkeletonProps) => (
  <Flex direction={isUser ? 'row-reverse' : 'row'} gap={4} mb={6} align="flex-start">
    <Skeleton width="40px" height="40px" borderRadius="full" flexShrink={0} />
    <Box
      maxW="70%"
      bg={isUser ? 'bg.subtle' : 'bg.input'}
      borderRadius="lg"
      px={4}
      py={3}
      borderWidth={{ base: '1px', _dark: '1.5px' }}
      borderColor="border.default"
      width="60%"
    >
      <Skeleton height="16px" width="90%" mb={2} />
      <Skeleton height="16px" width="70%" mb={2} />
      <Skeleton height="16px" width="85%" />
    </Box>
  </Flex>
);

export const ChatMessagesSkeletons = ({ count = 3 }: { count?: number }) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <ChatMessageSkeleton key={index} isUser={index % 2 === 0} />
    ))}
  </>
);
