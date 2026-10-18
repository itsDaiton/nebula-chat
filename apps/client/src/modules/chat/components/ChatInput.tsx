import { Box, Flex, chakra } from '@chakra-ui/react';
import { useMessageHandler } from '@/modules/chat/hooks/useMessageHandler';
import { useModelSelector } from '@/modules/chat/hooks/useModelSelector';
import type { ChatInputProps } from '@/modules/chat/types/types';
import { ModelSelect } from '@/modules/chat/components/ModelSelect';
import { SendButton } from '@/modules/chat/components/SendButton';
import { useTextareaAutoResize } from '@/shared/hooks/useTextareaAutoResize';
import { chatScrollBar } from '@/shared/components/scrollbar';
import { ChatInputArea } from '@/modules/chat/components/ChatInputArea';
import { useKeyboardHandler } from '@/shared/hooks/useKeyboardHandler';

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
    <chakra.form onSubmit={handleSubmit} p={4}>
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
    </chakra.form>
  );
};
