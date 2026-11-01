import { ArrowUpIcon } from 'lucide-react';
import { resources } from '@/resources';
import { IconButton } from '@/shared/components/ui/icon-button';

// The one control filled with the foreground colour, in both modes.
export const SendButton = ({ isLoading, message }: { isLoading: boolean; message: string }) => (
  <IconButton
    type="submit"
    size="icon"
    label={resources.chat.composer.send}
    className="size-8 rounded-full border-transparent bg-foreground text-background hover:bg-foreground/80 disabled:bg-border-strong disabled:text-muted-foreground disabled:opacity-100"
    disabled={!message.trim() || isLoading}
  >
    <ArrowUpIcon className="size-4" />
  </IconButton>
);
