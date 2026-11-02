import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import type { FieldValues, Path, UseFormRegisterReturn } from 'react-hook-form';
import type { z } from 'zod';
import type {
  backupCodeSchema,
  changePasswordSchema,
  confirmDeleteAccountSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  totpCodeSchema,
} from '@/modules/auth/utils/authSchemas';

export type UserMenuProps = {
  /** The Registered user's name, shown as initials on their Avatar. */
  name: string;
  /** Their Profile image URL, if they have one. */
  image?: string | null;
  /** The menu's heading and items. */
  children: ReactNode;
};

/** The fields the admin and two-factor plugins add to the user once the server enables them. */
export type UserPluginFields = { role?: string | null; twoFactorEnabled?: boolean | null };

export type UserAvatarProps = {
  /** The Registered user's name, shown as initials without a Profile image. */
  name: string;
  /** Their Profile image URL, if they have one. */
  image?: string | null;
  size?: 'sm' | '2xl';
};

/** What better-auth's client resolves with: a sign-in's data says when it needs a second factor. */
export type AuthResult = {
  data?: unknown;
  error: { code?: string; status: number } | null;
};

export type SignInCredentials = z.infer<typeof signInSchema>;

export type SignUpCredentials = z.infer<typeof signUpSchema>;

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export type DeleteAccountValues = z.infer<typeof deleteAccountSchema>;

export type ConfirmDeleteAccountValues = z.infer<typeof confirmDeleteAccountSchema>;

export type TwoFactorCodeValues = z.infer<typeof totpCodeSchema> | z.infer<typeof backupCodeSchema>;

/** A new password and its confirmation, as every form that sets one holds them. */
export type PasswordConfirmation = { password: string; confirmPassword: string };

/** The current password and its replacement, as the Password change form holds them. */
export type PasswordReplacement = { currentPassword: string; password: string };

/** Where a rule comparing two fields reports, and what it says. */
export type FieldComparisonError<Values> = { path: keyof Values & string; message: string };

/** The form field an auth failure belongs to; `root` is the form as a whole. */
export type AuthErrorField = 'email' | 'currentPassword' | 'password' | 'code' | 'root';

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
  /**
   * How much of its own heading the form shows, less where the page already labels it: `full` is title and
   * description, `description` sits under a dialog's own title, `none` sits inside a labelled settings row.
   */
  header?: 'full' | 'description' | 'none';
  /** The form sits among Settings controls: a button of their size and width, not a page's full-width one. */
  compact?: boolean;
  onSuccess?: (result: AuthResult) => void;
  /** Called after the failure is shown, for a page that reacts to a specific one. */
  onError?: (error: Error) => void;
  /** Shown at the end of a field's label row, such as the password's "Forgot password?". */
  labelActions?: Partial<Record<Path<Values>, ReactNode>>;
};

export type AuthFormFieldProps = {
  label: string;
  type: AuthFieldConfig<FieldValues>['type'];
  autoComplete: string;
  registration: UseFormRegisterReturn;
  error?: string;
  labelAction?: ReactNode;
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

export type AuthHeadingProps = {
  title: string;
  description?: ReactNode;
};

/** Why a sign-in stopped short of a session, and what the page shows in place of the form. */
export type AuthOutcome =
  | { kind: 'twoFactor'; canTrustDevice: boolean }
  | { kind: 'pendingDeletion'; purgeDate: string; restoreToken: string }
  | { kind: 'banned'; reason: string; until: string | null };

/** The search params a social sign-in's redirect back to /auth can carry. */
export type SocialSignInLanding = {
  pending?: string;
  restoreToken?: string;
  error?: string;
  errorDescription?: string;
};

export type AuthOutcomeViewProps = { outcome: AuthOutcome };

export type OutcomeIconProps = { icon: LucideIcon; className?: string };

/** "No account? Sign up" under the form, and its reverse. */
export type AuthSwitchProps = { prompt: string; action: string; onSwitch: () => void };

export type PendingDeletionPromptProps = Extract<AuthOutcome, { kind: 'pendingDeletion' }>;

export type BannedNoticeProps = Extract<AuthOutcome, { kind: 'banned' }>;

type TwoFactorMethod = 'totp' | 'backup';

/** One go at the sign-in's second factor. */
export type SecondFactorAttempt = TwoFactorCodeValues & { method: TwoFactorMethod };

export type TwoFactorChallengeProps = Omit<Extract<AuthOutcome, { kind: 'twoFactor' }>, 'kind'>;

export type TwoFactorCodeFormProps = {
  method: TwoFactorMethod;
  /** False for an Admin, who can't trust a device (ADR-0027 §2). */
  canTrustDevice: boolean;
  onOutcome: (outcome: AuthOutcome) => void;
};

export type AuthPageState = {
  form: 'sign-in' | 'sign-up';
  outcome: AuthOutcome | null;
  twoFactorMethod: TwoFactorMethod;
  /** Sign-up was refused because the email belongs to an account in Pending deletion. */
  emailPendingDeletion: boolean;
  showSignIn: () => void;
  showSignUp: () => void;
  showOutcome: (outcome: AuthOutcome) => void;
  toggleTwoFactorMethod: () => void;
  markEmailPendingDeletion: () => void;
  reset: () => void;
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
