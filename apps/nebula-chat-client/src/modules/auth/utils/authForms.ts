import { authClient } from '@/libs/auth/client';
import type {
  AuthFieldConfig,
  AuthFormConfig,
  ForgotPasswordValues,
  ResetPasswordValues,
  SignInCredentials,
  SignUpCredentials,
} from '@/modules/auth/types/types';
import { authCallbackUrl, verifyEmailCallbackUrl } from '@/modules/auth/utils/authCallbackUrl';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@/modules/auth/utils/authSchemas';
import { resources } from '@/resources';
import { route } from '@/routing/routes';

const { fields, tabs, actions, signIn, signUp, forgotPassword, resetPassword } = resources.auth;

const emailField = {
  name: 'email',
  label: fields.email,
  type: 'email',
  autoComplete: 'email',
} satisfies AuthFieldConfig<SignInCredentials>;

const passwordField = (autoComplete: 'current-password' | 'new-password') =>
  ({
    name: 'password',
    label: fields.password,
    type: 'password',
    autoComplete,
  }) satisfies AuthFieldConfig<SignInCredentials>;

export const SIGN_IN_FORM: AuthFormConfig<SignInCredentials> = {
  label: tabs.signIn,
  title: signIn.title,
  description: signIn.description,
  submitLabel: actions.signIn,
  schema: signInSchema,
  fields: [emailField, passwordField('current-password')],
  request: (credentials) => authClient.signIn.email(credentials),
};

export const SIGN_UP_FORM: AuthFormConfig<SignUpCredentials> = {
  label: tabs.signUp,
  title: signUp.title,
  description: signUp.description,
  submitLabel: actions.signUp,
  schema: signUpSchema,
  fields: [
    { name: 'name', label: fields.name, type: 'text', autoComplete: 'name' },
    emailField,
    passwordField('new-password'),
  ],
  request: (credentials) =>
    authClient.signUp.email({ ...credentials, callbackURL: verifyEmailCallbackUrl() }),
};

export const FORGOT_PASSWORD_FORM: AuthFormConfig<ForgotPasswordValues> = {
  label: forgotPassword.title,
  title: forgotPassword.title,
  description: forgotPassword.description,
  submitLabel: forgotPassword.submit,
  schema: forgotPasswordSchema,
  fields: [emailField],
  request: ({ email }) =>
    authClient.requestPasswordReset({
      email,
      redirectTo: authCallbackUrl(route.auth.resetPassword()),
    }),
  successMessage: forgotPassword.sent,
};

/** The reset form for the token better-auth put in the emailed link. */
export const resetPasswordForm = (token: string): AuthFormConfig<ResetPasswordValues> => ({
  label: resetPassword.title,
  title: resetPassword.title,
  description: resetPassword.description,
  submitLabel: resetPassword.submit,
  schema: resetPasswordSchema,
  fields: [{ ...passwordField('new-password'), label: fields.newPassword }],
  request: ({ password }) => authClient.resetPassword({ newPassword: password, token }),
  successMessage: resetPassword.done,
});
