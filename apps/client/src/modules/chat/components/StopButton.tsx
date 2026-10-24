import { Icon, IconButton } from '@chakra-ui/react';
import { IoStop } from 'react-icons/io5';
import type { StopButtonProps } from '@/modules/chat/types/types';
import { resources } from '@/resources';

// Not a submit button: it stops the reply streaming, it never sends the composer's text.
export const StopButton = ({ onStop }: StopButtonProps) => (
  <IconButton
    type="button"
    aria-label={resources.chat.stopReply}
    variant="solid"
    bg="fg.default"
    color="bg.default"
    boxSize={10}
    onClick={onStop}
    _hover={{
      bg: 'fg.soft',
    }}
    _active={{
      bg: 'fg.muted',
    }}
  >
    <Icon as={IoStop} />
  </IconButton>
);
