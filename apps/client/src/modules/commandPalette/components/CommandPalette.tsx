import { useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { HighlightedText } from '@/modules/commandPalette/components/HighlightedText';
import { PaletteSessionsGroup } from '@/modules/commandPalette/components/PaletteSessionsGroup';
import { useCommandPaletteStore } from '@/modules/commandPalette/stores/useCommandPaletteStore';
import { groupClass, itemClass, kbdClass } from '@/modules/commandPalette/utils/paletteClasses';
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
import { Badge } from '@/shared/components/ui/badge';
import { Kbd, KbdGroup } from '@/shared/components/ui/kbd';
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
      className="top-1/2 -translate-y-1/2 sm:max-w-[640px]"
      overlayClassName="supports-backdrop-filter:backdrop-blur-none"
    >
      <Command shouldFilter={false} loop className="rounded-none p-0">
        <CommandInput
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder={resources.commandPalette.placeholder}
          adornment={<Kbd className={kbdClass}>esc</Kbd>}
        />
        <CommandList className="h-[30rem] max-h-[55dvh] p-1.5">
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
              <CommandGroup key={group} heading={group} className={groupClass}>
                {items.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={`action:${action.id}`}
                    onSelect={() => {
                      close();
                      action.perform();
                    }}
                    className={itemClass}
                  >
                    {action.icon}
                    <span className="min-w-0 flex-1 truncate">
                      <HighlightedText text={action.label} query={query} />
                    </span>
                    {action.badge && (
                      <Badge variant="outline" className="h-[17px] px-1.5 font-mono text-[10.5px]">
                        {action.badge}
                      </Badge>
                    )}
                    {action.shortcut && (
                      <CommandShortcut className="tracking-normal">
                        <KbdGroup>
                          {[modifier, ...action.shortcut].map((key) => (
                            <Kbd key={key} className={kbdClass}>
                              {key}
                            </Kbd>
                          ))}
                        </KbdGroup>
                      </CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
        </CommandList>
        <div className="flex items-center gap-4 border-t border-border bg-raised px-3.5 py-2 text-[11.5px] text-faint">
          <span className="inline-flex items-center gap-1.5">
            <Kbd className={kbdClass}>↑</Kbd>
            <Kbd className={kbdClass}>↓</Kbd>
            {resources.commandPalette.navigate}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd className={kbdClass}>↵</Kbd>
            {resources.commandPalette.open}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd className={kbdClass}>esc</Kbd>
            {resources.commandPalette.close}
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
};
