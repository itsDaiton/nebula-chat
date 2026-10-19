import { useMatch } from 'react-router';
import { Box, Text } from '@chakra-ui/react';
import type { SessionListItemProps } from '@/modules/sessions/types/types';
import { formatDate } from '@/shared/utils/dateUtils';

export const SessionListItem = ({ session, onClick }: SessionListItemProps) => {
  const match = useMatch('/s/:id');
  const isActive = match?.params.id === session.id;

  return (
    <Box
      p={3}
      borderRadius="md"
      cursor="pointer"
      bg={isActive ? 'bg.muted' : 'transparent'}
      _hover={{ bg: 'bg.muted' }}
      transition="background 0.2s"
      onClick={() => onClick(session.id)}
      borderWidth="1px"
      borderColor={isActive ? 'border.default' : 'transparent'}
    >
      <Text fontSize="sm" fontWeight="medium" color="fg.default" lineClamp={1} mb={1}>
        {session.title}
      </Text>
      <Text fontSize="xs" color="fg.muted">
        {formatDate(session.createdAt)}
      </Text>
    </Box>
  );
};
