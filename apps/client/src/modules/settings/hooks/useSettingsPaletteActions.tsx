import { SettingsIcon } from 'lucide-react';
import { useRegisterPaletteActions } from '@/modules/commandPalette/hooks/useRegisterPaletteActions';
import { useSettingsDialogStore } from '@/modules/settings/stores/useSettingsDialogStore';
import { resources } from '@/resources';
import { useKeyboardShortcut } from '@/shared/hooks/useKeyboardShortcut';

export const useSettingsPaletteActions = () => {
  const openSettings = useSettingsDialogStore((state) => state.openSettings);
  useKeyboardShortcut(',', () => openSettings(), { ctrl: true });

  useRegisterPaletteActions([
    {
      id: 'open-settings',
      group: resources.commandPalette.actions,
      label: resources.commandPalette.openSettings,
      keywords: ['preferences', 'account', 'profile'],
      icon: <SettingsIcon />,
      shortcut: [','],
      perform: () => openSettings(),
    },
  ]);
};
