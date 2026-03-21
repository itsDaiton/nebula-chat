import { Box } from '@chakra-ui/react';
import { ChatInput } from '@/modules/chat/components/ChatInput';
import type { ChatInputBarProps } from '@/modules/chat/types/types';

export const ChatInputBar = ({ onSend, isLoading, selectedModel, onModelChange }: ChatInputBarProps) => (
  <Box
    position="absolute"
    bottom="0"
    left="0"
    right="0"
    borderTop={{ base: '1px', _dark: '1.5px' }}
    borderColor="border.default"
  >
    <ChatInput
      onSendMessage={onSend}
      isLoading={isLoading}
      selectedModel={selectedModel}
      onModelChange={onModelChange}
    />
  </Box>
);
