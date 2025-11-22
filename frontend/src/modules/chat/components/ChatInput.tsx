import { Box, Textarea, Flex } from '@chakra-ui/react';
import { useMessageHandler } from '../hooks/useMessageHandler';
import { useKeyboardHandler } from '../hooks/useKeyboardHandler';
import { useTextareaAutoResize } from '../hooks/useTextareaAutoResize';
import { useModelSelector } from '../hooks/useModelSelector';
import type { ChatInputProps } from '../types/types';
import { ModelSelect } from './ModelSelect';
import { SendButton } from './SendButton';

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

  const { triggerWidth, isSelectOpen, setIsSelectOpen, measureRef } = useModelSelector({
    selectedModel,
    onModelChange,
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
        <Textarea
          ref={inputRef}
          value={message}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
          autoFocus
          placeholder="Ask me anything..."
          size="lg"
          px={4}
          py={3}
          pb={1}
          disabled={isLoading}
          bg="transparent"
          border="none"
          color="fg.soft"
          resize="none"
          minH="auto"
          maxH="200px"
          overflow="hidden"
          rows={1}
          css={{
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'var(--chakra-colors-border-default)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'var(--chakra-colors-border-emphasized)',
            },
          }}
          _focus={{
            outline: 'none',
            boxShadow: 'none',
          }}
          _disabled={{
            cursor: 'not-allowed',
            opacity: 0.7,
          }}
          _placeholder={{
            color: 'fg.muted',
          }}
        />
        <Flex align="center" justify="flex-end" gap={2} px={2} pb={2} minH="40px">
          <ModelSelect
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            isSelectOpen={isSelectOpen}
            setIsSelectOpen={setIsSelectOpen}
            triggerWidth={triggerWidth}
          />
          <Box
            as="span"
            ref={measureRef}
            position="absolute"
            visibility="hidden"
            whiteSpace="nowrap"
            fontSize="sm"
            fontWeight={500}
            pointerEvents="none"
            left="-9999px"
          />
          <SendButton isLoading={isLoading} message={message} />
        </Flex>
      </Box>
    </Box>
  );
};
