import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import type { z } from 'zod';
import type { profileNameSchema } from '@/modules/settings/utils/settingsSchemas';

export type SettingsLayoutProps = {
  children: ReactNode;
};

/** One entry in the settings navigation, and the route that renders it. */
export type SettingsSection = {
  label: string;
  icon: IconType;
  path: string;
};

/** A titled group of settings rows. */
export type SettingsSectionProps = {
  title: string;
  children: ReactNode;
};

/** One setting: what it is on the left, its control on the right. */
export type SettingsRowProps = {
  label: string;
  description?: string;
  children: ReactNode;
};

export type ProfileNameFormProps = {
  /** The Registered user's current name. */
  name: string;
};

export type ProfileNameValues = z.infer<typeof profileNameSchema>;

export type PasswordChangeState = {
  isPasswordFormOpen: boolean;
  togglePasswordForm: () => void;
  closePasswordForm: () => void;
};
