import { authClient } from '@/libs/auth/client';
import type {
  AuthFieldConfig,
  AuthFormConfig,
  SignInCredentials,
  SignUpCredentials,
} from '@/modules/auth/types/types';
import { signInSchema, signUpSchema } from '@/modules/auth/utils/authSchemas';
import { resources } from '@/resources';

const { fields, tabs, actions } = resources.auth;

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
  submitLabel: actions.signIn,
  schema: signInSchema,
  fields: [emailField, passwordField('current-password')],
  request: (credentials) => authClient.signIn.email(credentials),
};

export const SIGN_UP_FORM: AuthFormConfig<SignUpCredentials> = {
  label: tabs.signUp,
  submitLabel: actions.signUp,
  schema: signUpSchema,
  fields: [
    { name: 'name', label: fields.name, type: 'text', autoComplete: 'name' },
    emailField,
    passwordField('new-password'),
  ],
  request: (credentials) => authClient.signUp.email(credentials),
};
