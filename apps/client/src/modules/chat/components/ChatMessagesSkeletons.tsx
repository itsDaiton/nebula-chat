import { useMemo } from 'react';
import { ChatMessageSkeleton } from '@/modules/chat/components/ChatMessageSkeleton';

export const ChatMessagesSkeletons = ({ count = 5 }: { count?: number }) => {
  const ids = useMemo(() => Array.from({ length: count }, () => crypto.randomUUID()), [count]);

  return (
    <>
      {ids.map((id, index) => (
        <ChatMessageSkeleton key={id} isUser={index % 2 === 0} />
      ))}
    </>
  );
};
