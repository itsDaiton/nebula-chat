import { z } from 'zod';
import type {
  FieldComparisonError,
  PasswordConfirmation,
  PasswordReplacement,
} from '@/modules/auth/types/types';
import { resources } from '@/resources';

const { validation, errors } = resources.auth;

// better-auth's default password bounds; the server enforces them again.
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

const email = z
  .string()
  .trim()
  .min(1, validation.emailRequired)
  .pipe(z.email(validation.emailInvalid));

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, validation.passwordTooShort)
  .max(PASSWORD_MAX_LENGTH, validation.passwordTooLong);

/**
 * A rule comparing two string fields, its error on `path`. It runs even while other fields
 * are invalid: zod skips an object refinement after any field's issue unless told otherwise.
 */
const compareFields = <Values extends Record<string, unknown>>(
  [first, second]: [keyof Values & string, keyof Values & string],
  isValid: (first: string, second: string) => boolean,
  { path, message }: FieldComparisonError<Values>,
): Parameters<z.ZodType<Values>['refine']> => [
  (values) => isValid(values[first] as string, values[second] as string),
  {
    path: [path],
    message,
    when: ({ value }) => {
      const values = value as Partial<Values>;
      return typeof values[first] === 'string' && typeof values[second] === 'string';
    },
  },
];

/** The confirmation must repeat `password`; the mismatch shows under `confirmPassword`. */
const confirmsPassword = compareFields<PasswordConfirmation>(
  ['password', 'confirmPassword'],
  (password, confirmation) => password === confirmation,
  { path: 'confirmPassword', message: validation.passwordMismatch },
);

export const signInSchema = z.object({
  email,
  password: z.string().min(1, validation.passwordRequired),
});

export const signUpSchema = z
  .object({
    name: z.string().trim().min(1, validation.nameRequired),
    email,
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine(...confirmsPassword);

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirmPassword: z.string() })
  .refine(...confirmsPassword);

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, validation.passwordRequired),
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine(
    ...compareFields<PasswordReplacement>(
      ['currentPassword', 'password'],
      (current, next) => !current || current !== next,
      { path: 'password', message: errors.passwordReused },
    ),
  )
  .refine(...confirmsPassword);
