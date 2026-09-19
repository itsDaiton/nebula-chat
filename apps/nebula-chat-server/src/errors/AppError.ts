export class AppError extends Error {
  constructor(
    public override message: string,
    public status: number = 500,
    public error: string = 'InternalServerError',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id "${id}" not found` : `${resource} not found`;
    super(message, 404, 'NotFound');
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400, 'BadRequest');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'Unauthorized');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'Forbidden');
  }
}

/**
 * A Guest has exhausted the message allowance (ADR-0010 §4). The stable `error`
 * name `RegistrationRequired` is the machine-readable signal the client detects
 * to render a login wall — do not rename it without updating the client.
 */
export class RegistrationRequiredError extends AppError {
  constructor(
    message: string = 'Guest message allowance reached. Register or sign in to continue.',
  ) {
    super(message, 403, 'RegistrationRequired');
  }
}

export class MissingConfigurationError extends AppError {
  constructor(configName: string) {
    super(`${configName} is not configured`, 500, 'MissingConfiguration');
  }
}

export class ClientInitializationError extends AppError {
  constructor(clientName: string = 'Client') {
    super(`Failed to initialize ${clientName}`, 500, 'ClientInitializationError');
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message: string) {
    super(message, 413, 'PayloadTooLarge');
  }
}

export class APIError extends AppError {
  constructor(message: string, status: number = 500) {
    super(message, status, 'APIError');
  }
}

export class RedisConnectionError extends AppError {
  constructor(message: string = 'Failed to connect to Redis') {
    super(message, 500, 'RedisConnectionError');
  }
}

export class RedisCacheError extends AppError {
  constructor(message: string = 'Redis cache operation failed') {
    super(message, 500, 'RedisCacheError');
  }
}
