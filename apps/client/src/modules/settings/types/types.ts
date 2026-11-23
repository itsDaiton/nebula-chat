import type { ReactNode } from 'react';
import type { OwnKey } from '@/libs/api/generated/model/ownKey';
import type { OwnKeyProvider } from '@/libs/api/generated/model/ownKeyProvider';
import type { z } from 'zod';
import type { profileNameSchema } from '@/modules/settings/utils/settingsSchemas';

/** The Settings dialog's sections, in nav order. */
export type SettingsSectionId =
  'profile' | 'security' | 'archived' | 'keys' | 'appearance' | 'account';

export type SettingsDialogState = {
  isOpen: boolean;
  section: SettingsSectionId;
  /** What the search box holds; cleared when the dialog closes. */
  query: string;
  /** Opens the dialog on `section`, or on Profile. */
  openSettings: (section?: SettingsSectionId) => void;
  closeSettings: () => void;
  setSection: (section: SettingsSectionId) => void;
  setQuery: (query: string) => void;
};

export type PasswordChangeState = {
  isPasswordFormOpen: boolean;
  togglePasswordForm: () => void;
  closePasswordForm: () => void;
};

/** One setting: what it is on the left, its control on the right. */
export type SettingsRowProps = {
  label: string;
  description?: ReactNode;
  /** The control goes beneath the label rather than beside it, for a wide control. */
  stacked?: boolean;
  children?: ReactNode;
};

export type ProfileNameFormProps = {
  /** The Registered user's current name. */
  name: string;
};

export type ProfileImageSettingProps = {
  /** The Registered user's name, for the initials shown without a Profile image. */
  name: string;
  /** Their Profile image URL, if they have one. */
  image: string | null;
};

export type OwnKeySettingProps = {
  provider: OwnKeyProvider;
  /** The stored key's readable facts, or `undefined` when none is saved. */
  stored: OwnKey | undefined;
};

export type AccountIdSettingProps = {
  /** The user's id, a UUID. */
  id: string;
};

export type ProfileNameValues = z.infer<typeof profileNameSchema>;

export type PasswordPromptProps = {
  prompt: string;
  submitLabel: string;
  isPending: boolean;
  /** An inline error from the last attempt. */
  error?: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
};

/** Where the two-factor setup stands; the codes and URI exist only until it is done. */
type TwoFactorStep =
  | { name: 'idle' }
  | { name: 'password' }
  | { name: 'scan'; totpURI: string; backupCodes: string[] }
  | { name: 'backup'; backupCodes: string[] }
  | { name: 'disable' }
  | { name: 'regenerate' }
  | { name: 'verify' };

export type TwoFactorSetupState = {
  step: TwoFactorStep;
  /** The 6 digits typed on the scan step. */
  code: string;
  setStep: (step: TwoFactorStep) => void;
  setCode: (code: string) => void;
  reset: () => void;
};

export type TwoFactorCodeFieldProps = {
  code: string;
  onChange: (code: string) => void;
  isPending: boolean;
  error?: string;
};

export type BackupCodesProps = {
  codes: string[];
};

export type SegmentedControlProps<Value extends string> = {
  label: string;
  value: Value;
  options: { value: Value; label: string }[];
  onChange: (value: Value) => void;
};

export type TwoFactorSetupHeaderProps = {
  step: number;
  text: string;
  onCancel?: () => void;
};

export type TwoFactorScanStepProps = {
  /** The `otpauth://` URI the QR code and the manual key come from. */
  totpURI: string;
  backupCodes: string[];
};

export type TwoFactorBackupStepProps = {
  backupCodes: string[];
};

export type TwoFactorConfirmStepProps = {
  action: 'disable' | 'regenerate';
};

export type ThemePreviewProps = {
  mode: 'system' | 'light' | 'dark';
};

export type ThemePreviewHalfProps = {
  dark: boolean;
};
