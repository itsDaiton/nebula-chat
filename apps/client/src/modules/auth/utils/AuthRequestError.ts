import { AppError, type ErrorCode } from '@nebula-chat/errors';
import type { AuthErrorField } from '@/modules/auth/types/types';

/** A rejected better-auth call, carrying the form field its message belongs under. */
export class AuthRequestError extends AppError {
  readonly field: AuthErrorField;
  /** better-auth's own error code (e.g. `INVALID_TOKEN`), for callers that react to one. */
  readonly authCode: string | undefined;

  constructor(
    code: ErrorCode,
    message: string,
    field: AuthErrorField,
    authCode?: string,
    options?: ErrorOptions,
  ) {
    super(code, message, options);
    this.field = field;
    this.authCode = authCode;
  }
}
