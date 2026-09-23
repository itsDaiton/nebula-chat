import type { ErrorCode } from './errorEnvelope';

const CODE_BY_STATUS: Readonly<Record<number, ErrorCode>> = {
  400: 'BadRequest',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'NotFound',
  409: 'Conflict',
  413: 'PayloadTooLarge',
  422: 'Validation',
  429: 'TooManyRequests',
};

/**
 * The code for an HTTP status, for errors that arrive with a status but no code
 * of their own (framework errors, upstream APIs). An unmapped 4xx is still the
 * caller's fault, so it reads as `BadRequest`; everything else is `Internal`.
 */
export const errorCodeForStatus = (status: number): ErrorCode => {
  const code = CODE_BY_STATUS[status];
  if (code) {
    return code;
  }
  return status >= 400 && status < 500 ? 'BadRequest' : 'Internal';
};
