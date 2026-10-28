import { useRouter } from '@tanstack/react-router';
import { LayoutDashboardIcon } from 'lucide-react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useRegisterPaletteActions } from '@/modules/commandPalette/hooks/useRegisterPaletteActions';
import { resources } from '@/resources';

export const useAuthPaletteActions = () => {
  const { isAdmin } = useAuth();
  const router = useRouter();

  useRegisterPaletteActions([
    {
      id: 'open-admin',
      group: resources.commandPalette.admin,
      label: resources.commandPalette.openAdmin,
      keywords: ['dashboard', 'users'],
      icon: <LayoutDashboardIcon />,
      visible: isAdmin,
      // The admin dashboard has no route yet (#531), so the path is pushed rather than typed.
      perform: () => router.history.push('/admin'),
    },
  ]);
};
