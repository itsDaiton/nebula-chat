import { SettingsIcon } from 'lucide-react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useRegisterPaletteActions } from '@/modules/commandPalette/hooks/useRegisterPaletteActions';
import { useSettingsDialogStore } from '@/modules/settings/stores/useSettingsDialogStore';
import { SETTINGS_SECTIONS } from '@/modules/settings/utils/settingsSections';
import { resources } from '@/resources';
import { useKeyboardShortcut } from '@/shared/hooks/useKeyboardShortcut';

export const useSettingsPaletteActions = () => {
  const openSettings = useSettingsDialogStore((state) => state.openSettings);
  const { isRegistered } = useAuth();
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
    ...SETTINGS_SECTIONS.map(({ id, label, icon: Icon, guest }) => ({
      id: `open-settings-${id}`,
      group: resources.commandPalette.actions,
      label: resources.commandPalette.settingsSection(label),
      keywords: ['preferences', 'settings'],
      icon: <Icon />,
      visible: isRegistered || guest,
      perform: () => openSettings(id),
    })),
  ]);
};
