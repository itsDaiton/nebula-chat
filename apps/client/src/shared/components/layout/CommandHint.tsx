import { SearchIcon } from 'lucide-react';
import { ShortcutKeys } from '@/shared/components/layout/ShortcutKeys';
import { Button } from '@/shared/components/ui/button';
import { SEARCH_SHORTCUT } from '@/shared/config/panels';
import { useSearchStore } from '@/shared/stores/useSearchStore';
import { resources } from '@/resources';

// Opens the chat search for now; the command palette takes this shortcut over in its own ticket.
export const CommandHint = () => {
  const openSearch = useSearchStore((state) => state.openSearch);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={openSearch}
      aria-label={resources.shell.commandHint}
      aria-keyshortcuts="Control+K Meta+K"
      className="hidden w-64 justify-start text-muted-foreground md:inline-flex"
    >
      <SearchIcon />
      {resources.shell.commandHint}
      <ShortcutKeys shortcut={SEARCH_SHORTCUT} className="ml-auto" />
    </Button>
  );
};
