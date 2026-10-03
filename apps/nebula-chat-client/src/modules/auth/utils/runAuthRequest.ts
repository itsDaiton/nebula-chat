import { AppError, errorCodeForStatus } from '@nebula-chat/errors';
import type { AuthResult } from '@/modules/auth/types/types';
import { resources } from '@/resources';

// better-auth's codes (core + Have I Been Pwned) mapped to copy; anything else is generic.
const MESSAGE_BY_CODE: Partial<Record<string, string>> = {
  PASSWORD_COMPROMISED: resources.auth.errors.passwordCompromised,
  USER_ALREADY_EXISTS: resources.auth.errors.userExists,
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: resources.auth.errors.userExists,
  INVALID_EMAIL_OR_PASSWORD: resources.auth.errors.invalidCredentials,
  INVALID_EMAIL: resources.auth.errors.invalidEmail,
  PASSWORD_TOO_SHORT: resources.auth.errors.passwordTooShort,
  PASSWORD_TOO_LONG: resources.auth.errors.passwordTooLong,
};

/** Runs a better-auth call, rejecting with an AppError whose message is safe to show. */
export const runAuthRequest = async (request: () => Promise<AuthResult>): Promise<void> => {
  const result = await request().catch((cause: unknown) => {
    throw new AppError('Internal', resources.errors.network, { cause });
  });
  if (!result.error) return;

  const { code, status } = result.error;
  throw new AppError(
    errorCodeForStatus(status),
    MESSAGE_BY_CODE[code ?? ''] ?? resources.auth.errors.unknown,
    { cause: result.error },
  );
};
