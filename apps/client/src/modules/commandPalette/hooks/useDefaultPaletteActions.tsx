import { MoonIcon, SunIcon } from 'lucide-react';
import { useRegisterPaletteActions } from '@/modules/commandPalette/hooks/useRegisterPaletteActions';
import { resources } from '@/resources';
import { useThemeMode } from '@/shared/hooks/useThemeMode';

/** The actions no feature module owns. */
export const useDefaultPaletteActions = () => {
  const { themeMode, toggleThemeMode } = useThemeMode();

  useRegisterPaletteActions([
    {
      id: 'toggle-theme',
      group: resources.commandPalette.actions,
      label: resources.commandPalette.toggleTheme,
      keywords: ['dark', 'light', 'color mode'],
      icon: themeMode === 'dark' ? <SunIcon /> : <MoonIcon />,
      shortcut: ['⇧', 'Y'],
      perform: toggleThemeMode,
    },
  ]);
};
