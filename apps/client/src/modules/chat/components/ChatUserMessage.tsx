import type { ChatMessageProps } from '@/modules/chat/types/types';

export const ChatUserMessage = ({ message }: ChatMessageProps) => (
  <div className="mt-1.5 mb-[22px] flex justify-end">
    <div className="max-w-[85%] rounded-[18px_18px_6px_18px] border border-border bg-raised px-3.5 py-2.5 text-[14px] leading-[1.55] whitespace-pre-wrap sm:max-w-[72%]">
      {message.content}
    </div>
  </div>
);
