import { MessageMetaRow } from '@/modules/chat/components/MessageMetaRow';
import type { ChatMessageProps } from '@/modules/chat/types/types';
import { MarkdownContent } from '@/shared/components/ui/markdown-content';

/** An answer as an Admin reads it: the text and its meta row, with nothing tied to the live chat. */
export const ChatReadOnlyAssistantMessage = ({ message }: Pick<ChatMessageProps, 'message'>) => (
  <div className="group/message mb-[26px]">
    <MarkdownContent content={message.content} />
    <MessageMetaRow message={message} />
  </div>
);
