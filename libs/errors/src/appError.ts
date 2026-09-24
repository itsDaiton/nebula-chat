import { INTERNAL_ERROR_ENVELOPE } from './errorEnvelope';
import type { ErrorCode, ErrorEnvelope } from './errorEnvelope';
import { ERROR_STATUS } from './errorStatus';

/**
 * A classified error. Its code decides its HTTP status, and `toEnvelope()` is
 * what the client is told. Anything thrown that is not an AppError is treated
 * as internal and never shown to the client verbatim.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = ERROR_STATUS[code];
  }

  toEnvelope(): ErrorEnvelope {
    // An Internal error is a server-side fault: its message stays in the logs.
    if (this.code === 'Internal') {
      return INTERNAL_ERROR_ENVELOPE;
    }
    return { success: false, error: this.code, message: this.message };
  }
}

export const isAppError = (value: unknown): value is AppError => value instanceof AppError;

export class BadRequestError extends AppError {
  constructor(message: string) {
    super('BadRequest', message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('Validation', message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super('Unauthorized', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super('Forbidden', message);
  }
}

/** A Guest has spent their message allowance and must register to continue. */
export class MessageAllowanceReachedError extends AppError {
  constructor(limit: number) {
    super(
      'MessageAllowanceReached',
      `Message allowance exceeded: a Guest can send at most ${limit} messages.`,
    );
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super('NotFound', id ? `${resource} with id "${id}" not found` : `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('Conflict', message);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message: string) {
    super('PayloadTooLarge', message);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests') {
    super('TooManyRequests', message);
  }
}

export class MissingConfigurationError extends AppError {
  constructor(configName: string) {
    super('Internal', `${configName} is not configured`);
  }
}
