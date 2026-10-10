import { authClient } from '@/libs/auth/client';
import type {
  AuthFieldConfig,
  AuthFormConfig,
  ChangePasswordValues,
  ForgotPasswordValues,
  ResetPasswordValues,
  SignInCredentials,
  SignUpCredentials,
} from '@/modules/auth/types/types';
import { authCallbackUrl, verifyEmailCallbackUrl } from '@/modules/auth/utils/authCallbackUrl';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@/modules/auth/utils/authSchemas';
import { resources } from '@/resources';
import { route } from '@/routing/routes';

const { fields, tabs, actions, signIn, signUp, forgotPassword, resetPassword } = resources.auth;
const { changePassword } = resources.settings;

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

/** Repeats the new password; the schema rule `confirmsPassword` checks the two match. */
const confirmPasswordField = (label: string) =>
  ({
    name: 'confirmPassword',
    label,
    type: 'password',
    autoComplete: 'new-password',
    comparedWith: 'password',
  }) satisfies AuthFieldConfig<ResetPasswordValues>;

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
    confirmPasswordField(fields.confirmPassword),
  ],
  // The confirmation only guards against a typo; it never leaves the browser.
  request: ({ name, email, password }) =>
    authClient.signUp.email({ name, email, password, callbackURL: verifyEmailCallbackUrl() }),
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
  fields: [
    { ...passwordField('new-password'), label: fields.newPassword },
    confirmPasswordField(fields.confirmNewPassword),
  ],
  request: ({ password }) => authClient.resetPassword({ newPassword: password, token }),
  successMessage: resetPassword.done,
});

/** A Registered user's Password change; the new password keeps the name `password` the error map targets. */
export const CHANGE_PASSWORD_FORM: AuthFormConfig<ChangePasswordValues> = {
  label: changePassword.submit,
  title: changePassword.title,
  description: changePassword.description,
  submitLabel: changePassword.submit,
  schema: changePasswordSchema,
  fields: [
    {
      name: 'currentPassword',
      label: fields.currentPassword,
      type: 'password',
      autoComplete: 'current-password',
    },
    {
      ...passwordField('new-password'),
      label: fields.newPassword,
      comparedWith: 'currentPassword',
    },
    confirmPasswordField(fields.confirmNewPassword),
  ],
  request: ({ currentPassword, password }) =>
    authClient.changePassword({
      currentPassword,
      newPassword: password,
      revokeOtherSessions: true,
    }),
};
