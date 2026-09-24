import { generalErrorCodeSchema } from './errorEnvelope';
import type { ErrorCode, GeneralErrorCode } from './errorEnvelope';

/** The HTTP status each code answers with. Typed so every code must have one. */
export const ERROR_STATUS: Readonly<Record<ErrorCode, number>> = {
  BadRequest: 400,
  Validation: 400,
  Unauthorized: 401,
  Forbidden: 403,
  MessageAllowanceReached: 403,
  NotFound: 404,
  Conflict: 409,
  PayloadTooLarge: 413,
  TooManyRequests: 429,
  Internal: 500,
};

// Status → the first general code listed for it, so 400 reads as BadRequest
// rather than Validation.
const CODE_BY_STATUS = new Map<number, GeneralErrorCode>();
for (const code of generalErrorCodeSchema.options) {
  if (!CODE_BY_STATUS.has(ERROR_STATUS[code])) {
    CODE_BY_STATUS.set(ERROR_STATUS[code], code);
  }
}

/**
 * The code for an HTTP status, for errors that arrive with a status but no code
 * of their own (framework errors). An unmapped 4xx is still the caller's fault,
 * so it reads as `BadRequest`; everything else is `Internal`.
 */
export const errorCodeForStatus = (status: number): GeneralErrorCode => {
  const code = CODE_BY_STATUS.get(status);
  if (code) {
    return code;
  }
  return status >= 400 && status < 500 ? 'BadRequest' : 'Internal';
};
