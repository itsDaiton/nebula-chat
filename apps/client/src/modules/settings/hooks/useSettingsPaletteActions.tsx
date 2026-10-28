import { useNavigate } from '@tanstack/react-router';
import { SettingsIcon } from 'lucide-react';
import { useRegisterPaletteActions } from '@/modules/commandPalette/hooks/useRegisterPaletteActions';
import { resources } from '@/resources';
import { useKeyboardShortcut } from '@/shared/hooks/useKeyboardShortcut';

export const useSettingsPaletteActions = () => {
  const navigate = useNavigate();
  useKeyboardShortcut(',', () => void navigate({ to: '/settings' }), { ctrl: true });

  useRegisterPaletteActions([
    {
      id: 'open-settings',
      group: resources.commandPalette.actions,
      label: resources.commandPalette.openSettings,
      keywords: ['preferences', 'account', 'profile'],
      icon: <SettingsIcon />,
      shortcut: [','],
      perform: () => void navigate({ to: '/settings' }),
    },
  ]);
};
