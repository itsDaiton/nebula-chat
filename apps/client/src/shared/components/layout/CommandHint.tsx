import { SearchIcon } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Kbd, KbdGroup } from '@/shared/components/ui/kbd';
import { SEARCH_SHORTCUT } from '@/shared/config/panels';
import { useOS } from '@/shared/hooks/useOS';
import { useSearchStore } from '@/shared/stores/useSearchStore';
import { getShortcutKeys } from '@/shared/utils/osUtils';
import { resources } from '@/resources';

// Opens the chat search for now; the command palette takes this shortcut over in its own ticket.
export const CommandHint = () => {
  const os = useOS();
  const openSearch = useSearchStore((state) => state.openSearch);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={openSearch}
      className="hidden w-64 justify-start text-muted-foreground md:inline-flex"
    >
      <SearchIcon />
      {resources.shell.commandHint}
      <KbdGroup className="ml-auto">
        {getShortcutKeys(SEARCH_SHORTCUT, os).map((key) => (
          <Kbd key={key}>{key}</Kbd>
        ))}
      </KbdGroup>
    </Button>
  );
};
