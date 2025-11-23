import { Icon, IconButton } from '@chakra-ui/react';
import { IoArrowUpOutline } from 'react-icons/io5';

export const SendButton = ({ isLoading, message }: { isLoading: boolean; message: string }) => (
  <IconButton
    type="submit"
    aria-label="Send message"
    variant="solid"
    bg="fg.default"
    color="bg.default"
    boxSize={10}
    loading={isLoading}
    _hover={{
      bg: 'fg.soft',
    }}
    _active={{
      bg: 'fg.muted',
    }}
    _disabled={{
      opacity: 0.4,
      bg: 'gray.500',
    }}
    disabled={!message.trim() || isLoading}
  >
    <Icon as={IoArrowUpOutline} />
  </IconButton>
);
