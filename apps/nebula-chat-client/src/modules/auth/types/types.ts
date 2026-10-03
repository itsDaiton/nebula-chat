import type { ReactNode } from 'react';
import type { FieldValues, Path, UseFormRegisterReturn } from 'react-hook-form';
import type { z } from 'zod';
import type { signInSchema, signUpSchema } from '@/modules/auth/utils/authSchemas';

export type AuthGateProps = {
  children: ReactNode;
};

/** What better-auth's client resolves with; only the failure matters to the forms. */
export type AuthResult = {
  error: { code?: string; status: number } | null;
};

export type SignInCredentials = z.infer<typeof signInSchema>;

export type SignUpCredentials = z.infer<typeof signUpSchema>;

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

/** Everything that tells the sign-in form from the sign-up form. */
export type AuthFormConfig<Values extends FieldValues> = {
  label: string;
  title: string;
  description: string;
  submitLabel: string;
  schema: z.ZodType<Values, Values>;
  fields: AuthFieldConfig<Values>[];
  request: (values: Values) => Promise<AuthResult>;
};

export type AuthFormProps<Values extends FieldValues> = {
  config: AuthFormConfig<Values>;
};

export type AuthFormFieldProps = {
  label: string;
  type: AuthFieldConfig<FieldValues>['type'];
  autoComplete: string;
  registration: UseFormRegisterReturn;
  error?: string;
};

export type AuthFormAlertProps = {
  message?: string;
};

export type PasswordVisibilityState = {
  isPasswordVisible: boolean;
  togglePasswordVisibility: () => void;
  hidePassword: () => void;
};
