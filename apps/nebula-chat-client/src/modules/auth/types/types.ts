import type { ReactNode } from 'react';

export type AuthGateProps = {
  children: ReactNode;
};

/** What better-auth's client resolves with; only the failure matters to the forms. */
export type AuthResult = {
  error: { code?: string; status: number } | null;
};

export type SignInCredentials = {
  email: string;
  password: string;
};

export type SignUpCredentials = SignInCredentials & {
  name: string;
};

export type AuthFormAlertProps = {
  error: Error | null;
};

export type AuthFieldProps = {
  label: string;
  name: string;
  type: 'text' | 'email' | 'password';
  autoComplete: string;
};
