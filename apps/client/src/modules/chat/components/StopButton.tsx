import { SquareIcon } from 'lucide-react';
import type { StopButtonProps } from '@/modules/chat/types/types';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';

// Not a submit button: it stops the reply streaming, it never sends the composer's text.
export const StopButton = ({ onStop }: StopButtonProps) => (
  <Button
    type="button"
    size="icon"
    aria-label={resources.chat.stopReply}
    className="size-8 rounded-full border-transparent bg-foreground text-background hover:bg-foreground/80"
    onClick={onStop}
  >
    <SquareIcon className="size-3 fill-current" />
  </Button>
);
