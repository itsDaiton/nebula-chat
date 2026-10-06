import { AppError, errorCodeForStatus } from '@nebula-chat/errors';
import type { AuthErrorDescription, AuthResult } from '@/modules/auth/types/types';
import { AuthRequestError } from '@/modules/auth/utils/AuthRequestError';
import { resources } from '@/resources';

const { errors, validation, resetPassword, social } = resources.auth;

// better-auth's codes (core, social sign-in + Have I Been Pwned), each placed under the field it concerns.
const AUTH_ERRORS: Partial<Record<string, AuthErrorDescription>> = {
  PASSWORD_COMPROMISED: { field: 'password', message: errors.passwordCompromised },
  PASSWORD_REUSED: { field: 'password', message: errors.passwordReused },
  PASSWORD_TOO_SHORT: { field: 'password', message: validation.passwordTooShort },
  PASSWORD_TOO_LONG: { field: 'password', message: validation.passwordTooLong },
  USER_ALREADY_EXISTS: { field: 'email', message: errors.userExists },
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: { field: 'email', message: errors.userExists },
  INVALID_EMAIL: { field: 'email', message: validation.emailInvalid },
  INVALID_EMAIL_OR_PASSWORD: { field: 'root', message: errors.invalidCredentials },
  INVALID_TOKEN: { field: 'root', message: resetPassword.linkInvalid },
  // The server has no credentials for the provider (it is configured per environment).
  PROVIDER_NOT_FOUND: { field: 'root', message: social.errors.unavailable },
};

const UNKNOWN_ERROR: AuthErrorDescription = { field: 'root', message: errors.unknown };

// better-auth's rate limiter answers 429 with no code of its own.
const TOO_MANY_REQUESTS: AuthErrorDescription = { field: 'root', message: errors.tooManyRequests };

/** Runs a better-auth call, rejecting with an AppError whose message is safe to show. */
export const runAuthRequest = async (request: () => Promise<AuthResult>): Promise<void> => {
  const result = await request().catch((cause: unknown) => {
    throw new AppError('Internal', resources.errors.network, { cause });
  });
  if (!result.error) return;

  const { code, status } = result.error;
  const { field, message } =
    status === 429 ? TOO_MANY_REQUESTS : (AUTH_ERRORS[code ?? ''] ?? UNKNOWN_ERROR);
  throw new AuthRequestError(errorCodeForStatus(status), message, field, code, {
    cause: result.error,
  });
};
