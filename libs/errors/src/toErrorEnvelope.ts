import { isAppError } from './appError';
import { INTERNAL_ERROR_ENVELOPE } from './errorEnvelope';
import type { ErrorEnvelope } from './errorEnvelope';

/**
 * The envelope for any thrown value: an AppError speaks for itself, and
 * anything else is `Internal`, so raw internal messages (driver errors,
 * provider errors, stack details) never reach the client.
 */
export const toErrorEnvelope = (error: unknown): ErrorEnvelope =>
  isAppError(error) ? error.toEnvelope() : INTERNAL_ERROR_ENVELOPE;
