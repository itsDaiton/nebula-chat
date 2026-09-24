import { INTERNAL_ERROR_ENVELOPE } from './errorEnvelope';
import type { ErrorCode, ErrorEnvelope, MessageAllowanceDetails } from './errorEnvelope';
import { ERROR_STATUS } from './errorStatus';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** An envelope without its constant `success` flag: what an AppError is built from. */
type ErrorBody = DistributiveOmit<ErrorEnvelope, 'success'>;

/**
 * A classified error. Its code decides its HTTP status, and `toEnvelope()` is
 * what the client is told. Anything thrown that is not an AppError is treated
 * as internal and never shown to the client verbatim.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly #body: ErrorBody;

  constructor(body: ErrorBody) {
    super(body.message);
    this.name = new.target.name;
    this.code = body.error;
    this.status = ERROR_STATUS[body.error];
    this.#body = body;
  }

  toEnvelope(): ErrorEnvelope {
    // An Internal error is a server-side fault: its message stays in the logs.
    if (this.code === 'Internal') {
      return INTERNAL_ERROR_ENVELOPE;
    }
    return { success: false, ...this.#body };
  }
}

export const isAppError = (value: unknown): value is AppError => value instanceof AppError;

export class BadRequestError extends AppError {
  constructor(message: string) {
    super({ error: 'BadRequest', message });
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super({ error: 'Validation', message });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super({ error: 'Unauthorized', message });
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super({ error: 'Forbidden', message });
  }
}

/** A Guest has spent their message allowance and must register to continue. */
export class MessageAllowanceReachedError extends AppError {
  constructor(details: MessageAllowanceDetails) {
    super({
      error: 'MessageAllowanceReached',
      message: 'Guest message allowance reached. Register or sign in to continue.',
      details,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id "${id}" not found` : `${resource} not found`;
    super({ error: 'NotFound', message });
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super({ error: 'Conflict', message });
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message: string) {
    super({ error: 'PayloadTooLarge', message });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests') {
    super({ error: 'TooManyRequests', message });
  }
}

export class MissingConfigurationError extends AppError {
  constructor(configName: string) {
    super({ error: 'Internal', message: `${configName} is not configured` });
  }
}
