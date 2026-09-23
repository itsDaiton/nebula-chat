// Envelope: the on-wire error contract (ADR-0011)
export {
  errorEnvelopeSchema,
  messageAllowanceDetailsSchema,
  isErrorEnvelope,
  parseErrorEnvelope,
} from './errorEnvelope';
export type {
  ErrorEnvelope,
  ErrorCode,
  ErrorDetails,
  MessageAllowanceDetails,
} from './errorEnvelope';

// Classified error classes
export {
  AppError,
  isAppError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  PayloadTooLargeError,
  TooManyRequestsError,
  MissingConfigurationError,
  ClientInitializationError,
  APIError,
  RedisConnectionError,
  RedisCacheError,
} from './appError';

// Classification
export { toErrorEnvelope, GENERIC_ERROR_MESSAGE } from './toErrorEnvelope';
export { errorCodeForStatus } from './errorCodeForStatus';
