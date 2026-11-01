import { PaperclipIcon } from 'lucide-react';
import { resources } from '@/resources';
import { IconButton } from '@/shared/components/ui/icon-button';

// Attachments are not built yet; the control holds the composer's final layout.
export const AttachButton = () => (
  <IconButton
    type="button"
    variant="ghost"
    size="icon-sm"
    disabled
    focusableWhenDisabled
    label={resources.chat.composer.attach}
    className="text-faint"
  >
    <PaperclipIcon className="size-4" />
  </IconButton>
);
