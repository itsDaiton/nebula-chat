import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import type { FieldValues, Path, UseFormRegisterReturn } from 'react-hook-form';
import type { z } from 'zod';
import type {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@/modules/auth/utils/authSchemas';

export type AuthGateProps = {
  children: ReactNode;
};

export type AccountMenuProps = {
  /** Shown as initials on the avatar; without one (a Guest) the avatar is a generic person. */
  name?: string;
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

/** The form field an auth failure belongs to; `root` is the form as a whole. */
export type AuthErrorField = 'email' | 'password' | 'root';

export type AuthErrorDescription = {
  field: AuthErrorField;
  message: string;
};

export type AuthFieldConfig<Values extends FieldValues> = {
  name: Path<Values>;
  label: string;
  type: 'text' | 'email' | 'password';
  autoComplete: string;
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
  /** Shown in place of the form once it succeeds; without one, `onSuccess` moves on. */
  successMessage?: string;
};

export type AuthFormProps<Values extends FieldValues> = {
  config: AuthFormConfig<Values>;
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
  isPasswordVisible: boolean;
  togglePasswordVisibility: () => void;
  hidePassword: () => void;
};

/** The social sign-in providers the server can enable (`socialProviders` in `@nebula-chat/auth`). */
export type SocialProvider = 'google' | 'github';

export type SocialProviderConfig = {
  provider: SocialProvider;
  label: string;
  icon: IconType;
};
