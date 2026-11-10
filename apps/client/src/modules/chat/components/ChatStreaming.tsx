import { LoaderCircleIcon } from 'lucide-react';
import { useWaitingPhrase } from '@/modules/chat/hooks/useWaitingPhrase';
import { resources } from '@/resources';

export const ChatStreaming = () => {
  const phrase = useWaitingPhrase();
  return (
    <output
      aria-label={resources.chat.waitingForReply}
      className="mb-[26px] flex items-center gap-2 py-1 text-muted-foreground"
    >
      <LoaderCircleIcon className="size-4 animate-spin" aria-hidden />
      <span className="waiting-phrase" aria-hidden>
        {phrase}
      </span>
    </output>
  );
};
