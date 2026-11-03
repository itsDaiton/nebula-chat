import { MessageMetaRow } from '@/modules/chat/components/MessageMetaRow';
import type { ChatMessageProps } from '@/modules/chat/types/types';
import { MarkdownContent } from '@/shared/components/ui/markdown-content';

export const ChatAssistantMessage = ({ message, onRegenerate, isStreaming }: ChatMessageProps) => (
  <div className="group/message mb-[26px]">
    <MarkdownContent content={message.content} />
    {!isStreaming && <MessageMetaRow message={message} onRegenerate={onRegenerate} />}
  </div>
);
