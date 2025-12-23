import { Box, Text } from '@chakra-ui/react';
import type { ConversationListItemProps } from '../types/types';
import { formatDate } from '@/shared/utils/formatDate';

export const ConversationListItem = ({ conversation, onClick }: ConversationListItemProps) => (
  <Box
    p={3}
    borderRadius="md"
    cursor="pointer"
    bg="transparent"
    _hover={{ bg: 'bg.muted' }}
    transition="background 0.2s"
    onClick={() => onClick(conversation.id)}
    borderWidth="1px"
    borderColor="transparent"
  >
    <Text fontSize="sm" fontWeight="medium" color="fg.default" lineClamp={1} mb={1}>
      {conversation.title}
    </Text>
    <Text fontSize="xs" color="fg.muted">
      {formatDate(conversation.createdAt)}
    </Text>
  </Box>
);
