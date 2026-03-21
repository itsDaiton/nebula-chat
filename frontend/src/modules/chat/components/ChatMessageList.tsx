import { ChatMessage } from './ChatMessage';
import { ChatStreaming } from './ChatStreaming';
import type { ChatMessageListProps } from '../types/types';

export const ChatMessageList = ({ history, isStreaming }: ChatMessageListProps) => (
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
      return <ChatMessage key={message.id} message={message} />;
    })}
    {isStreaming && history.at(-1)?.role === 'assistant' && !history.at(-1)?.content && (
      <ChatStreaming />
    )}
  </>
);
