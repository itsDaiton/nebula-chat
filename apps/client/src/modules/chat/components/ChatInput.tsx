import { AttachButton } from '@/modules/chat/components/AttachButton';
import { ModelSelect } from '@/modules/chat/components/ModelSelect';
import { RunToggle } from '@/modules/chat/components/RunToggle';
import { SendButton } from '@/modules/chat/components/SendButton';
import { StopButton } from '@/modules/chat/components/StopButton';
import { useMessageHandler } from '@/modules/chat/hooks/useMessageHandler';
import type { ChatInputProps } from '@/modules/chat/types/types';
import { resources } from '@/resources';
import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
} from '@/shared/components/ui/prompt-input';
import { useKeyboardHandler } from '@/shared/hooks/useKeyboardHandler';
import { useTextareaAutoResize } from '@/shared/hooks/useTextareaAutoResize';

export const ChatInput = ({
  onSendMessage,
  isLoading = false,
  selectedModel,
  onModelChange,
  onStop,
}: ChatInputProps) => {
  const { message, setMessage, handleSubmit, handleMessageSend } = useMessageHandler({
    onSendMessage,
    isLoading,
  });

  const { inputRef } = useKeyboardHandler({ message, isLoading, handleMessageSend });

  useTextareaAutoResize(inputRef as React.RefObject<HTMLTextAreaElement>);

  return (
    <PromptInput onSubmit={handleSubmit}>
      <PromptInputTextarea
        ref={inputRef}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        autoFocus
        aria-label={resources.chat.composer.label}
        placeholder={resources.chat.composer.placeholder}
      />
      <PromptInputActions>
        <AttachButton />
        <RunToggle />
        <span className="flex-1" />
        <ModelSelect selectedModel={selectedModel} onModelChange={onModelChange} />
        {isLoading && onStop ? (
          <StopButton onStop={onStop} />
        ) : (
          <SendButton isLoading={isLoading} message={message} />
        )}
      </PromptInputActions>
    </PromptInput>
  );
};
