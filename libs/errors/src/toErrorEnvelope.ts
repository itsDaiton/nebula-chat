import { isAppError } from './appError';
import type { ErrorEnvelope } from './errorEnvelope';

/** What the client is told about any error the server did not classify. */
export const GENERIC_ERROR_MESSAGE = 'An internal server error occurred';

/**
 * The envelope for a thrown value: an AppError speaks for itself, and anything
 * else becomes `Internal` with a generic message, so raw internal messages
 * (driver errors, provider errors, stack details) never reach the client. An
 * AppError classified as `Internal` (missing configuration, Redis failures) is
 * a server-side fault too, so its message is withheld the same way.
 */
export const toErrorEnvelope = (error: unknown): ErrorEnvelope => {
  if (!isAppError(error) || error.code === 'Internal') {
    return { success: false, error: 'Internal', message: GENERIC_ERROR_MESSAGE };
  }

  // AppError's constructor already ties `details` to its code, which the
  // compiler cannot see through the unnarrowed `code` here.
  return {
    success: false,
    error: error.code,
    message: error.message,
    ...(error.details !== undefined && { details: error.details }),
  } as ErrorEnvelope;
};
