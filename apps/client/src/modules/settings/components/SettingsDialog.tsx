import { SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { SettingsSectionContent } from '@/modules/settings/components/SettingsSectionContent';
import type { SettingsSectionId } from '@/modules/settings/types/types';
import { useSettingsDialogStore } from '@/modules/settings/stores/useSettingsDialogStore';
import { SETTINGS_INDEX, SETTINGS_SECTIONS } from '@/modules/settings/utils/settingsSections';
import { resources } from '@/resources';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/utils/cn';

/** Settings as a modal over the app: the sections on the left, the active one on the right. */
export const SettingsDialog = () => {
  const { isOpen, section, closeSettings, setSection } = useSettingsDialogStore();
  const { isRegistered } = useAuth();
  const [query, setQuery] = useState('');

  const sections = SETTINGS_SECTIONS.filter(({ guest }) => isRegistered || guest);
  const active = sections.find(({ id }) => id === section) ?? sections[0];

  const needle = query.trim().toLowerCase();
  const results = needle
    ? SETTINGS_INDEX.filter(
        ({ section: id, label, keywords }) =>
          sections.some((entry) => entry.id === id) &&
          `${label} ${keywords}`.toLowerCase().includes(needle),
      )
    : [];

  const pick = (id: SettingsSectionId) => {
    setSection(id);
    setQuery('');
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) return;
        setQuery('');
        closeSettings();
      }}
    >
      <DialogContent
        showCloseButton
        overlayClassName="bg-black/40 supports-backdrop-filter:backdrop-blur-none"
        className="app-shell h-[640px] max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[900px] md:grid md:grid-cols-[220px_1fr] md:grid-rows-1"
      >
        <div className="flex min-h-0 flex-col gap-2 border-b border-border p-3 md:border-r md:border-b-0 md:p-4">
          <DialogTitle className="px-2 pt-1 pb-2 text-base font-semibold">
            {resources.settings.title}
          </DialogTitle>
          <DialogDescription className="sr-only">{resources.settings.nav}</DialogDescription>
          <div className="relative">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && results[0]) pick(results[0].section);
              }}
              aria-label={resources.settings.search.label}
              placeholder={resources.settings.search.placeholder}
              className="pl-8"
            />
          </div>
          {needle ? (
            <ul aria-label={resources.settings.search.label} className="flex flex-col gap-1">
              {results.length === 0 && (
                <li className="px-2.5 py-2 text-sm text-muted-foreground">
                  {resources.settings.search.empty}
                </li>
              )}
              {results.map(({ section: id, label }) => (
                <li key={`${id}-${label}`}>
                  <button
                    type="button"
                    onClick={() => pick(id)}
                    className="flex w-full flex-col rounded-lg px-2.5 py-1.5 text-left text-sm outline-none hover:bg-hover focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {label}
                    <span className="text-xs text-muted-foreground">
                      {sections.find((entry) => entry.id === id)?.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <nav
              aria-label={resources.settings.nav}
              className="flex gap-1 overflow-x-auto md:flex-col"
            >
              {sections.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-current={active?.id === id ? 'page' : undefined}
                  onClick={() => setSection(id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    active?.id === id ? 'bg-muted font-medium' : 'hover:bg-hover',
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </nav>
          )}
        </div>
        <div className="flex min-h-0 flex-col">
          <h2 className="shrink-0 border-b border-border px-5 py-4 text-base font-semibold">
            {active?.label}
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {active && <SettingsSectionContent section={active.id} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
