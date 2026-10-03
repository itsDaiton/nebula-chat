import { AppError, type ErrorCode } from '@nebula-chat/errors';
import type { AuthErrorField } from '@/modules/auth/types/types';

/** A rejected better-auth call, carrying the form field its message belongs under. */
export class AuthRequestError extends AppError {
  readonly field: AuthErrorField;

  constructor(code: ErrorCode, message: string, field: AuthErrorField, options?: ErrorOptions) {
    super(code, message, options);
    this.field = field;
  }
}
