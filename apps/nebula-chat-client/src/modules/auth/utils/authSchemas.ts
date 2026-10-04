import { z } from 'zod';
import { resources } from '@/resources';

const { validation } = resources.auth;

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

export const signInSchema = z.object({
  email,
  password: z.string().min(1, validation.passwordRequired),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, validation.nameRequired),
  email,
  password: newPassword,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({ password: newPassword });
