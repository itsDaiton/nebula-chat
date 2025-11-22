import { Box, Flex } from '@chakra-ui/react';
import { useMessageHandler } from '../hooks/useMessageHandler';
import { useKeyboardHandler } from '../hooks/useKeyboardHandler';
import { useModelSelector } from '../hooks/useModelSelector';
import type { ChatInputProps } from '../types/types';
import { ModelSelect } from './ModelSelect';
import { SendButton } from './SendButton';
import { useTextareaAutoResize } from '@/shared/hooks/useTextareaAutoResize';
import { chatScrollBar } from '@/shared/components/scrollbar';
import { ChatInputArea } from './ChatInputArea';

export const ChatInput = ({
  onSendMessage,
  isLoading = false,
  selectedModel,
  onModelChange,
}: ChatInputProps) => {
  const { message, setMessage, handleSubmit, handleMessageSend } = useMessageHandler({
    onSendMessage,
    isLoading,
  });

  const { inputRef } = useKeyboardHandler({
    message,
    isLoading,
    handleMessageSend,
  });

  useTextareaAutoResize(inputRef as React.RefObject<HTMLTextAreaElement>);

  const { triggerWidth, isSelectOpen, setIsSelectOpen } = useModelSelector({
    selectedModel,
  });

  return (
    <Box as="form" onSubmit={handleSubmit} p={4}>
      <Box
        position="relative"
        bg="bg.input"
        borderRadius="lg"
        borderColor="border.default"
        borderWidth={{ base: '1px', _dark: '1.5px' }}
        transition="all 0.2s"
        _hover={{
          borderColor: 'border.emphasized',
        }}
        _focusWithin={{
          borderColor: 'border.emphasized',
          boxShadow: '0 0 0 1px var(--chakra-colors-border-emphasized)',
        }}
      >
        <ChatInputArea
          inputRef={inputRef}
          message={message}
          setMessage={setMessage}
          isLoading={isLoading}
          chatScrollBar={chatScrollBar}
        />
        <Flex align="center" justify="flex-end" gap={2} px={2} pb={2} minH="40px">
          <ModelSelect
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            isSelectOpen={isSelectOpen}
            setIsSelectOpen={setIsSelectOpen}
            triggerWidth={triggerWidth}
          />
          <SendButton isLoading={isLoading} message={message} />
        </Flex>
      </Box>
    </Box>
  );
};
