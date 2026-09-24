// Envelope: the on-wire error contract (ADR-0011)
export {
  errorEnvelopeSchema,
  generalErrorCodeSchema,
  messageAllowanceDetailsSchema,
  GENERIC_ERROR_MESSAGE,
  INTERNAL_ERROR_ENVELOPE,
  isErrorEnvelope,
  parseErrorEnvelope,
} from './errorEnvelope';
export type {
  ErrorEnvelope,
  ErrorCode,
  GeneralErrorCode,
  MessageAllowanceDetails,
} from './errorEnvelope';

// Codes → HTTP statuses
export { ERROR_STATUS, errorCodeForStatus } from './errorStatus';

// Classified error classes
export {
  AppError,
  isAppError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  MessageAllowanceReachedError,
  NotFoundError,
  ConflictError,
  PayloadTooLargeError,
  TooManyRequestsError,
  MissingConfigurationError,
} from './appError';

// Classification of anything thrown
export { toErrorEnvelope } from './toErrorEnvelope';
