import { CheckIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { SettingsGroup } from '@/modules/settings/components/SettingsGroup';
import { SettingsRow } from '@/modules/settings/components/SettingsRow';
import type { AppearanceFont } from '@/modules/settings/types/types';
import { resources } from '@/resources';
import { useAppearanceStore } from '@/shared/stores/useAppearanceStore';
import { cn } from '@/shared/utils/cn';

const { theme, font: fontCopy } = resources.settings.appearance;

const THEMES = ['system', 'light', 'dark'] as const;
const FONTS: AppearanceFont[] = ['geist', 'system'];

const Preview = ({ mode }: { mode: (typeof THEMES)[number] }) => (
  <span
    aria-hidden
    className={cn(
      'flex h-16 items-center justify-center gap-1 overflow-hidden border-b border-border p-2',
      mode === 'dark' ? 'bg-neutral-950' : 'bg-white',
    )}
  >
    <span
      className={cn('h-full w-4 rounded', mode === 'dark' ? 'bg-neutral-800' : 'bg-neutral-200')}
    />
    <span
      className={cn('h-full flex-1 rounded', mode === 'dark' ? 'bg-neutral-800' : 'bg-neutral-100')}
    />
  </span>
);

/** Theme and interface font, both applied at once and remembered. */
export const AppearanceSetting = () => {
  const { theme: current = 'system', setTheme } = useTheme();
  const { font, setFont } = useAppearanceStore();
  const active = THEMES.find((mode) => mode === current) ?? 'system';

  return (
    <SettingsGroup>
      <SettingsRow label={theme.label} description={theme.description[active]}>
        <div role="radiogroup" aria-label={theme.label} className="flex gap-3">
          {THEMES.map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={active === mode}
              onClick={() => setTheme(mode)}
              className={cn(
                'w-32 overflow-hidden rounded-lg border text-left text-[13px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                active === mode ? 'border-foreground' : 'border-border',
              )}
            >
              <Preview mode={mode} />
              <span className="flex items-center gap-1.5 px-2.5 py-1.5">
                {active === mode && <CheckIcon className="size-3.5" />}
                {theme[mode]}
              </span>
            </button>
          ))}
        </div>
      </SettingsRow>
      <SettingsRow label={fontCopy.label} description={fontCopy.description}>
        <div
          role="radiogroup"
          aria-label={fontCopy.label}
          className="flex rounded-lg border border-border p-0.5"
        >
          {FONTS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={font === option}
              onClick={() => setFont(option)}
              className={cn(
                'rounded-md px-3 py-1 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                font === option ? 'bg-muted font-medium' : 'text-muted-foreground',
              )}
            >
              {fontCopy[option]}
            </button>
          ))}
        </div>
      </SettingsRow>
    </SettingsGroup>
  );
};
