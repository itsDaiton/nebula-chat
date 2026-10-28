import { PaperclipIcon } from 'lucide-react';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';

// Attachments are not built yet; the control holds the composer's final layout.
export const AttachButton = () => (
  <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    disabled
    aria-label={resources.chat.composer.attach}
    className="text-faint"
  >
    <PaperclipIcon className="size-4" />
  </Button>
);
