import { errorCodeForStatus } from './errorCodeForStatus';
import type { ErrorCode, ErrorDetails, MessageAllowanceDetails } from './errorEnvelope';

type AppErrorOptions<C extends ErrorCode> = {
  code: C;
  status: number;
  message: string;
  details?: ErrorDetails<C>;
};

/**
 * A classified, client-safe error: its `code`, `message` and `details` are what
 * reach the client in the error envelope, and `status` is the HTTP status the
 * JSON error handler answers with. Anything thrown that is not an AppError is
 * treated as internal and never shown to the client verbatim.
 */
export class AppError<C extends ErrorCode = ErrorCode> extends Error {
  readonly code: C;
  readonly status: number;
  readonly details: ErrorDetails<C> | undefined;

  constructor({ code, status, message, details }: AppErrorOptions<C>) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const isAppError = (value: unknown): value is AppError => value instanceof AppError;

export class NotFoundError extends AppError<'NotFound'> {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id "${id}" not found` : `${resource} not found`;
    super({ code: 'NotFound', status: 404, message });
  }
}

export class BadRequestError extends AppError<'BadRequest'> {
  constructor(message: string) {
    super({ code: 'BadRequest', status: 400, message });
  }
}

export class UnauthorizedError extends AppError<'Unauthorized'> {
  constructor(message: string = 'Unauthorized') {
    super({ code: 'Unauthorized', status: 401, message });
  }
}

export class ForbiddenError extends AppError<'Forbidden'> {
  constructor(message: string = 'Forbidden', details?: MessageAllowanceDetails) {
    super({ code: 'Forbidden', status: 403, message, details });
  }
}

export class PayloadTooLargeError extends AppError<'PayloadTooLarge'> {
  constructor(message: string) {
    super({ code: 'PayloadTooLarge', status: 413, message });
  }
}

export class TooManyRequestsError extends AppError<'TooManyRequests'> {
  constructor(message: string = 'Too many requests') {
    super({ code: 'TooManyRequests', status: 429, message });
  }
}

export class MissingConfigurationError extends AppError<'Internal'> {
  constructor(configName: string) {
    super({ code: 'Internal', status: 500, message: `${configName} is not configured` });
  }
}

export class ClientInitializationError extends AppError<'Internal'> {
  constructor(clientName: string = 'Client') {
    super({ code: 'Internal', status: 500, message: `Failed to initialize ${clientName}` });
  }
}

/** A failure reported by an external API; its status decides the code. */
export class APIError extends AppError {
  constructor(message: string, status: number = 500) {
    super({ code: errorCodeForStatus(status), status, message });
  }
}

export class RedisConnectionError extends AppError<'Internal'> {
  constructor(message: string = 'Failed to connect to Redis') {
    super({ code: 'Internal', status: 500, message });
  }
}

export class RedisCacheError extends AppError<'Internal'> {
  constructor(message: string = 'Redis cache operation failed') {
    super({ code: 'Internal', status: 500, message });
  }
}
