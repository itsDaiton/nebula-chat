import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import type { FieldValues, Path, UseFormRegisterReturn } from 'react-hook-form';
import type { z } from 'zod';
import type {
  changePasswordSchema,
  confirmDeleteAccountSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@/modules/auth/utils/authSchemas';

export type AuthGateProps = {
  children: ReactNode;
};

export type UserMenuProps = {
  /** The Registered user's name, shown as initials on their Avatar. */
  name: string;
  /** The menu's heading and items. */
  children: ReactNode;
};

/** What better-auth's client resolves with; only the failure matters to the forms. */
export type AuthResult = {
  error: { code?: string; status: number } | null;
};

export type SignInCredentials = z.infer<typeof signInSchema>;

export type SignUpCredentials = z.infer<typeof signUpSchema>;

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export type DeleteAccountValues = z.infer<typeof deleteAccountSchema>;

export type ConfirmDeleteAccountValues = z.infer<typeof confirmDeleteAccountSchema>;

/** A new password and its confirmation, as every form that sets one holds them. */
export type PasswordConfirmation = { password: string; confirmPassword: string };

/** The current password and its replacement, as the Password change form holds them. */
export type PasswordReplacement = { currentPassword: string; password: string };

/** Where a rule comparing two fields reports, and what it says. */
export type FieldComparisonError<Values> = { path: keyof Values & string; message: string };

/** The form field an auth failure belongs to; `root` is the form as a whole. */
export type AuthErrorField = 'email' | 'currentPassword' | 'password' | 'root';

export type AuthErrorDescription = {
  field: AuthErrorField;
  message: string;
};

export type AuthFieldConfig<Values extends FieldValues> = {
  name: Path<Values>;
  label: string;
  type: 'text' | 'email' | 'password';
  autoComplete: string;
  /** A field this one is checked against: once touched, it re-validates as that one changes. */
  comparedWith?: Path<Values>;
};

/** Everything that tells one auth form from another. */
export type AuthFormConfig<Values extends FieldValues> = {
  label: string;
  title: string;
  description: string;
  submitLabel: string;
  schema: z.ZodType<Values, Values>;
  fields: AuthFieldConfig<Values>[];
  request: (values: Values) => Promise<AuthResult>;
  /** Shown in place of the form once it succeeds; without one, the fields clear and `onSuccess` runs. */
  successMessage?: string;
  /** The submit button warns that the action can't be undone. */
  destructive?: boolean;
};

export type AuthFormProps<Values extends FieldValues> = {
  config: AuthFormConfig<Values>;
  /** Whether the form shows its own title and description; off where the page already labels it. */
  showHeader?: boolean;
  onSuccess?: () => void;
  /** Called after the failure is shown, for a page that reacts to a specific one. */
  onError?: (error: Error) => void;
};

export type AuthFormFieldProps = {
  label: string;
  type: AuthFieldConfig<FieldValues>['type'];
  autoComplete: string;
  registration: UseFormRegisterReturn;
  error?: string;
};

type AuthAlertStatus = 'error' | 'success';

export type AuthFormAlertProps = {
  message?: string;
  status?: AuthAlertStatus;
};

export type AuthLayoutProps = {
  children: ReactNode;
  footer?: ReactNode;
};

/** A titled outcome shown in place of a form: its success, or a link that failed. */
export type AuthStatusProps = {
  title: string;
  status: AuthAlertStatus;
  message: string;
  children?: ReactNode;
};

export type PasswordVisibilityState = {
  /** Unmasked password fields by name; each field's toggle reveals only that field. */
  visibleFields: Record<string, boolean>;
  togglePasswordVisibility: (field: string) => void;
  hidePassword: () => void;
};

/** The social sign-in providers the server can enable (`socialProviders` in `@nebula-chat/auth`). */
export type SocialProvider = 'google' | 'github';

export type SocialProviderConfig = {
  provider: SocialProvider;
  label: string;
  icon: IconType;
};
