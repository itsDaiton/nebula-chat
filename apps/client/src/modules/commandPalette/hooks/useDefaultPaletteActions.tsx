import { MoonIcon, SunIcon } from 'lucide-react';
import { useRegisterPaletteActions } from '@/modules/commandPalette/hooks/useRegisterPaletteActions';
import { resources } from '@/resources';
import { useColorMode } from '@/theme/hooks/useColorMode';

/** The actions no feature module owns. */
export const useDefaultPaletteActions = () => {
  const { colorMode, toggleColorMode } = useColorMode();

  useRegisterPaletteActions([
    {
      id: 'toggle-theme',
      group: resources.commandPalette.actions,
      label: resources.commandPalette.toggleTheme,
      keywords: ['dark', 'light', 'color mode'],
      icon: colorMode === 'dark' ? <SunIcon /> : <MoonIcon />,
      perform: toggleColorMode,
    },
  ]);
};
