import { useNavigate } from '@tanstack/react-router';
import { LayoutDashboardIcon } from 'lucide-react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useRegisterPaletteActions } from '@/modules/commandPalette/hooks/useRegisterPaletteActions';
import { resources } from '@/resources';

export const useAuthPaletteActions = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useRegisterPaletteActions([
    {
      id: 'open-admin',
      group: resources.commandPalette.admin,
      label: resources.commandPalette.openAdmin,
      keywords: ['dashboard', 'users'],
      icon: <LayoutDashboardIcon />,
      badge: resources.account.admin,
      visible: isAdmin,
      perform: () => void navigate({ to: '/admin' }),
    },
  ]);
};
