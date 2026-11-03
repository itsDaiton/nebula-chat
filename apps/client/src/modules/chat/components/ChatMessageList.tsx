import { ChatMessage } from '@/modules/chat/components/ChatMessage';
import { StoppedReplyNote } from '@/modules/chat/components/StoppedReplyNote';
import { ChatStreaming } from '@/modules/chat/components/ChatStreaming';
import type { ChatMessageListProps } from '@/modules/chat/types/types';

export const ChatMessageList = ({
  history,
  isStreaming,
  isReplyStopped = false,
  onRegenerate,
}: ChatMessageListProps) => {
  const last = history.at(-1);
  const prompt = history.at(-2);
  const retryPrompt = history.findLast((message) => message.role === 'user')?.content;
  const canRegenerate =
    !isStreaming && last?.role === 'assistant' && prompt?.role === 'user' && onRegenerate;

  return (
    <>
      {history.map((message, index) => {
        if (
          isStreaming &&
          index === history.length - 1 &&
          message.role === 'assistant' &&
          !message.content
        ) {
          return null;
        }
        const isNewestReply = index === history.length - 1;
        return (
          <ChatMessage
            key={message.id}
            message={message}
            isStreaming={isStreaming && isNewestReply}
            onRegenerate={
              canRegenerate && isNewestReply ? () => onRegenerate(prompt.content) : undefined
            }
          />
        );
      })}
      {isStreaming && last?.role === 'assistant' && !last.content && <ChatStreaming />}
      {isReplyStopped && !isStreaming && (
        <StoppedReplyNote
          onRetry={retryPrompt && onRegenerate ? () => onRegenerate(retryPrompt) : undefined}
        />
      )}
    </>
  );
};
