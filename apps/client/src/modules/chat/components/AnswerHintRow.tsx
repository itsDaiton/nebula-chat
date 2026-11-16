import { CornerDownLeftIcon, XIcon } from 'lucide-react';
import { useWaitingRun } from '@/modules/chat/hooks/useWaitingRun';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';

const { clarify } = resources.chat;

/** Above the composer while a Run waits: the next message is its answer, or the Run is cancelled. */
export const AnswerHintRow = () => {
  const { waitingRun, cancel, isCancelling } = useWaitingRun();
  if (!waitingRun) return null;

  return (
    <div className="flex items-center gap-2 px-1.5 pb-2 text-[12.5px] text-muted-foreground">
      <CornerDownLeftIcon className="size-3.5 shrink-0" />
      <span className="flex-1">{clarify.answerHint}</span>
      {waitingRun.streamId && (
        <Button
          variant="ghost"
          size="xs"
          className="text-foreground-secondary"
          disabled={isCancelling}
          onClick={cancel}
        >
          <XIcon />
          {clarify.cancel}
        </Button>
      )}
    </div>
  );
};
