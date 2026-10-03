/* eslint-disable no-console */
import type { NebulaMenuItemProps } from '@/shared/types/types';

export const menuItems: NebulaMenuItemProps[] = [
  { id: 1, value: 'profile', label: 'Profile', onClick: () => console.log('Profile clicked') },
  { id: 2, value: 'settings', label: 'Settings', onClick: () => console.log('Settings clicked') },
];
