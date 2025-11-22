import { Icon, IconButton } from '@chakra-ui/react';
import { IoArrowUpOutline } from 'react-icons/io5';

export const SendButton = ({ isLoading, message }: { isLoading: boolean; message: string }) => (
  <IconButton
    type="submit"
    aria-label="Send message"
    variant="solid"
    bg="black"
    color="white"
    boxSize={10}
    loading={isLoading}
    _hover={{
      bg: 'gray.800',
    }}
    _active={{
      bg: 'gray.900',
    }}
    _disabled={{
      opacity: 0.4,
      bg: 'gray.600',
    }}
    disabled={!message.trim() || isLoading}
  >
    <Icon as={IoArrowUpOutline} />
  </IconButton>
);
