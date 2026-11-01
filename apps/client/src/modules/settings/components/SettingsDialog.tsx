import { useAuth } from '@/modules/auth/hooks/useAuth';
import { SettingsSectionContent } from '@/modules/settings/components/SettingsSectionContent';
import { useSettingsDialogStore } from '@/modules/settings/stores/useSettingsDialogStore';
import { SETTINGS_SECTIONS } from '@/modules/settings/utils/settingsSections';
import { resources } from '@/resources';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { cn } from '@/shared/utils/cn';

/** Settings as a modal over the app: the sections on the left, the active one on the right. */
export const SettingsDialog = () => {
  const { isOpen, section, closeSettings, setSection } = useSettingsDialogStore();
  const { isRegistered } = useAuth();

  const sections = SETTINGS_SECTIONS.filter(({ guest }) => isRegistered || guest);
  const active = sections.find(({ id }) => id === section) ?? sections[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeSettings()}>
      <DialogContent
        showCloseButton
        className="app-shell h-[640px] max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[900px] md:grid md:grid-cols-[220px_1fr] md:grid-rows-1"
      >
        <div className="flex min-h-0 flex-col gap-2 border-b border-border p-3 md:border-r md:border-b-0 md:p-4">
          <DialogTitle className="px-2 pt-1 pb-2 text-base font-semibold">
            {resources.settings.title}
          </DialogTitle>
          <DialogDescription className="sr-only">{resources.settings.nav}</DialogDescription>
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
                  active?.id === id
                    ? 'bg-muted font-medium'
                    : 'text-muted-foreground hover:bg-hover',
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </nav>
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
