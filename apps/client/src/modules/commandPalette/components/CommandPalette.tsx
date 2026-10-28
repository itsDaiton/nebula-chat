import { useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { PaletteSessionsGroup } from '@/modules/commandPalette/components/PaletteSessionsGroup';
import { useCommandPaletteStore } from '@/modules/commandPalette/stores/useCommandPaletteStore';
import { matchesQuery } from '@/modules/commandPalette/utils/matchesQuery';
import { resources } from '@/resources';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  Command,
} from '@/shared/components/ui/command';
import { Kbd } from '@/shared/components/ui/kbd';
import { useOS } from '@/shared/hooks/useOS';
import { useSearchStore } from '@/shared/stores/useSearchStore';

/** The Ctrl/⌘ K dialog: Sessions found through the API, then every action the modules registered. */
export const CommandPalette = () => {
  const { isSearchOpen, closeSearch } = useSearchStore();
  const { actions, query, setQuery, clearQuery } = useCommandPaletteStore();
  const navigate = useNavigate();
  const modifier = resources.shell.modifier[useOS()];

  // The element focused when the palette opens; the render that sees the flag flip runs before the dialog takes focus.
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  if (isSearchOpen !== wasOpen.current) {
    wasOpen.current = isSearchOpen;
    if (isSearchOpen) openerRef.current = document.activeElement as HTMLElement | null;
  }

  const close = () => {
    closeSearch();
    clearQuery();
  };

  const groups = [...new Set(actions.map((action) => action.group))].map((group) => ({
    group,
    items: actions.filter((action) => action.group === group && matchesQuery(action, query)),
  }));

  return (
    <CommandDialog
      open={isSearchOpen}
      onOpenChange={(open) => !open && close()}
      finalFocus={openerRef}
      className="sm:max-w-[640px]"
    >
      <Command shouldFilter={false} loop className="rounded-none p-0">
        <CommandInput
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder={resources.commandPalette.placeholder}
        />
        <CommandList className="max-h-[420px] p-1.5">
          <CommandEmpty className="text-faint">{resources.commandPalette.empty}</CommandEmpty>
          <PaletteSessionsGroup
            onSelect={(id) => {
              close();
              void navigate({ to: '/s/$id', params: { id } });
            }}
          />
          {groups
            .filter(({ items }) => items.length > 0)
            .map(({ group, items }) => (
              <CommandGroup key={group} heading={group}>
                {items.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={`action:${action.id}`}
                    onSelect={() => {
                      close();
                      action.perform();
                    }}
                  >
                    {action.icon}
                    {action.label}
                    {action.shortcut && (
                      <CommandShortcut className="tracking-normal">
                        <Kbd>{`${modifier} ${action.shortcut}`}</Kbd>
                      </CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
        </CommandList>
        <div className="flex items-center gap-4 border-t border-border bg-raised px-3.5 py-2 text-[11.5px] text-faint">
          <span className="inline-flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            {resources.commandPalette.navigate}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>↵</Kbd>
            {resources.commandPalette.open}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>esc</Kbd>
            {resources.commandPalette.close}
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
};
