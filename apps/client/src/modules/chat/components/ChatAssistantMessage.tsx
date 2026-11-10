import { MessageMetaRow } from '@/modules/chat/components/MessageMetaRow';
import { RunChip } from '@/modules/chat/components/RunChip';
import type { ChatMessageProps } from '@/modules/chat/types/types';
import { MarkdownContent } from '@/shared/components/ui/markdown-content';

export const ChatAssistantMessage = ({ message, onRegenerate, isStreaming }: ChatMessageProps) => (
  <div className="group/message mb-[26px]">
    <MarkdownContent content={message.content} />
    {!isStreaming && message.runId && <RunChip runId={message.runId} />}
    {!isStreaming && <MessageMetaRow message={message} onRegenerate={onRegenerate} />}
  </div>
);
