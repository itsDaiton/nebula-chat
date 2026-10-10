import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';

export type SettingsLayoutProps = {
  children: ReactNode;
};

/** One entry in the settings navigation, and the route that renders it. */
export type SettingsSection = {
  label: string;
  icon: IconType;
  path: string;
};
