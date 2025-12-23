import { Button, Flex } from '@chakra-ui/react';
import type { ConversationActionButtonProps } from '../types/types';

export const ConversationActionButton = ({
  icon,
  label,
  onClick,
}: ConversationActionButtonProps) => (
  <Button
    size="md"
    w="100%"
    variant="ghost"
    onClick={onClick}
    borderRadius="md"
    justifyContent="flex-start"
    _hover={{ bg: 'bg.muted' }}
    transition="background 0.2s"
  >
    <Flex align="center" gap={2}>
      {icon}
      {label}
    </Flex>
  </Button>
);
