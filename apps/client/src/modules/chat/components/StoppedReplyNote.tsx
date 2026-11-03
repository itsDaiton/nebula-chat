import { RotateCcwIcon } from 'lucide-react';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';

const { stopped } = resources.chat;

/** What a stopped reply leaves behind: the server persists nothing for an empty one, so this note says why there is no answer. */
export const StoppedReplyNote = ({ onRetry }: { onRetry?: () => void }) => (
  <div
    data-slot="stopped-reply-note"
    className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground"
  >
    <span>{stopped.note}</span>
    {onRetry && (
      <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={onRetry}>
        <RotateCcwIcon />
        {stopped.retry}
      </Button>
    )}
  </div>
);
