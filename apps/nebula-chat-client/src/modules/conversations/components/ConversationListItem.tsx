import { useMatch } from 'react-router';
import { Box, Text } from '@chakra-ui/react';
import type { ConversationListItemProps } from '@/modules/conversations/types/types';
import { formatDate } from '@/shared/utils/dateUtils';

export const ConversationListItem = ({ conversation, onClick }: ConversationListItemProps) => {
  const match = useMatch('/c/:id');
  const isActive = match?.params.id === conversation.id;

  return (
    <Box
      p={3}
      borderRadius="md"
      cursor="pointer"
      bg={isActive ? 'bg.muted' : 'transparent'}
      _hover={{ bg: 'bg.muted' }}
      transition="background 0.2s"
      onClick={() => onClick(conversation.id)}
      borderWidth="1px"
      borderColor={isActive ? 'border.default' : 'transparent'}
    >
      <Text fontSize="sm" fontWeight="medium" color="fg.default" lineClamp={1} mb={1}>
        {conversation.title}
      </Text>
      <Text fontSize="xs" color="fg.muted">
        {formatDate(conversation.createdAt)}
      </Text>
    </Box>
  );
};
