import { CheckIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { SettingsGroup } from '@/modules/settings/components/SettingsGroup';
import { SettingsRow } from '@/modules/settings/components/SettingsRow';
import { SegmentedControl } from '@/modules/settings/components/SegmentedControl';
import { ThemePreview } from '@/modules/settings/components/ThemePreview';
import { resources } from '@/resources';
import { useAppearanceStore } from '@/shared/stores/useAppearanceStore';
import { cn } from '@/shared/utils/cn';

const {
  theme,
  font: fontCopy,
  responseFont,
  textSize,
  width,
  motion,
} = resources.settings.appearance;

const THEMES = ['system', 'light', 'dark'] as const;

/** Theme and interface font, both applied at once and remembered. */
export const AppearanceSetting = () => {
  const { theme: current = 'system', setTheme } = useTheme();
  const appearance = useAppearanceStore();
  const { font, setAppearance } = appearance;
  const active = THEMES.find((mode) => mode === current) ?? 'system';

  return (
    <SettingsGroup>
      <SettingsRow label={theme.label} description={theme.description} stacked>
        <div role="radiogroup" aria-label={theme.label} className="flex gap-3">
          {THEMES.map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={active === mode}
              onClick={() => setTheme(mode)}
              className={cn(
                'w-40 overflow-hidden rounded-lg border text-left text-[13px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                active === mode ? 'border-foreground ring-2 ring-foreground' : 'border-border',
              )}
            >
              <ThemePreview mode={mode} />
              <span className="flex items-center gap-1.5 px-2.5 py-1.5">
                {active === mode && <CheckIcon className="size-3.5" />}
                {theme[mode]}
              </span>
            </button>
          ))}
        </div>
      </SettingsRow>
      <SettingsRow label={fontCopy.label} description={fontCopy.description}>
        <SegmentedControl
          label={fontCopy.label}
          value={font}
          onChange={(value) => setAppearance({ font: value })}
          options={[
            { value: 'geist', label: fontCopy.geist },
            { value: 'system', label: fontCopy.system },
          ]}
        />
      </SettingsRow>
      <SettingsRow label={responseFont.label} description={responseFont.description}>
        <SegmentedControl
          label={responseFont.label}
          value={appearance.responseFont}
          onChange={(value) => setAppearance({ responseFont: value })}
          options={[
            { value: 'match', label: responseFont.match },
            { value: 'geist', label: responseFont.geist },
            { value: 'system', label: responseFont.system },
          ]}
        />
      </SettingsRow>
      <SettingsRow label={textSize.label} description={textSize.description}>
        <SegmentedControl
          label={textSize.label}
          value={appearance.transcriptSize}
          onChange={(value) => setAppearance({ transcriptSize: value })}
          options={[
            { value: 'small', label: textSize.small },
            { value: 'medium', label: textSize.medium },
            { value: 'large', label: textSize.large },
          ]}
        />
      </SettingsRow>
      <SettingsRow label={width.label} description={width.description}>
        <SegmentedControl
          label={width.label}
          value={appearance.transcriptWidth}
          onChange={(value) => setAppearance({ transcriptWidth: value })}
          options={[
            { value: 'narrow', label: width.narrow },
            { value: 'wide', label: width.wide },
          ]}
        />
      </SettingsRow>
      <SettingsRow label={motion.label} description={motion.description}>
        <SegmentedControl
          label={motion.label}
          value={appearance.motion}
          onChange={(value) => setAppearance({ motion: value })}
          options={[
            { value: 'system', label: motion.system },
            { value: 'reduced', label: motion.reduced },
            { value: 'full', label: motion.full },
          ]}
        />
      </SettingsRow>
    </SettingsGroup>
  );
};
