import { useNavigate } from '@tanstack/react-router';
import { LayoutDashboardIcon } from 'lucide-react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useRegisterPaletteActions } from '@/modules/commandPalette/hooks/useRegisterPaletteActions';
import { resources } from '@/resources';
import { useKeyboardShortcut } from '@/shared/hooks/useKeyboardShortcut';

export const useAuthPaletteActions = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const openAdmin = () => void navigate({ to: '/admin' });
  useKeyboardShortcut('u', () => isAdmin && openAdmin(), { ctrl: true, shift: true });

  useRegisterPaletteActions([
    {
      id: 'open-admin',
      group: resources.commandPalette.admin,
      label: resources.commandPalette.openAdmin,
      keywords: ['dashboard', 'users'],
      icon: <LayoutDashboardIcon />,
      badge: resources.account.admin,
      shortcut: ['⇧', 'U'],
      visible: isAdmin,
      perform: openAdmin,
    },
  ]);
};
