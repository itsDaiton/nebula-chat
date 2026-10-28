import { useNavigate } from '@tanstack/react-router';
import { SettingsIcon } from 'lucide-react';
import { useRegisterPaletteActions } from '@/modules/commandPalette/hooks/useRegisterPaletteActions';
import { resources } from '@/resources';

export const useSettingsPaletteActions = () => {
  const navigate = useNavigate();

  useRegisterPaletteActions([
    {
      id: 'open-settings',
      group: resources.commandPalette.actions,
      label: resources.commandPalette.openSettings,
      keywords: ['preferences', 'account', 'profile'],
      icon: <SettingsIcon />,
      perform: () => void navigate({ to: '/settings' }),
    },
  ]);
};
