import { useNavigate } from '@tanstack/react-router';
import { SquarePenIcon } from 'lucide-react';
import { useRegisterPaletteActions } from '@/modules/commandPalette/hooks/useRegisterPaletteActions';
import { resources } from '@/resources';

export const useSessionPaletteActions = () => {
  const navigate = useNavigate();

  useRegisterPaletteActions([
    {
      id: 'new-chat',
      group: resources.commandPalette.actions,
      label: resources.commandPalette.newChat,
      keywords: ['session', 'conversation'],
      icon: <SquarePenIcon />,
      shortcut: 'E',
      perform: () => void navigate({ to: '/' }),
    },
  ]);
};
