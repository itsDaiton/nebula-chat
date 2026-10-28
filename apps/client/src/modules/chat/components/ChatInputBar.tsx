import { EmailVerificationPrompt } from '@/modules/auth/components/EmailVerificationPrompt';
import { ChatComposerFooter } from '@/modules/chat/components/ChatComposerFooter';
import { ChatInput } from '@/modules/chat/components/ChatInput';
import { MessageAllowancePrompt } from '@/modules/chat/components/MessageAllowancePrompt';
import type { ChatInputBarProps } from '@/modules/chat/types/types';

export const ChatInputBar = ({
  onSend,
  isLoading,
  selectedModel,
  onModelChange,
  onStop,
}: ChatInputBarProps) => (
  <div
    data-slot="chat-input-bar"
    className="mx-auto w-full max-w-[740px] shrink-0 px-3 pb-3 sm:px-7"
  >
    <MessageAllowancePrompt />
    <EmailVerificationPrompt />
    <ChatInput
      onSendMessage={onSend}
      isLoading={isLoading}
      selectedModel={selectedModel}
      onModelChange={onModelChange}
      onStop={onStop}
    />
    <ChatComposerFooter />
  </div>
);
