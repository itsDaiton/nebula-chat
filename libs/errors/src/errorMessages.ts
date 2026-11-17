import { GENERIC_ERROR_MESSAGE } from './errorEnvelope';
import type { ErrorCode } from './errorEnvelope';

/** What the client reads when a framework or schema message is withheld; typed so every code has one. */
export const ERROR_MESSAGE: Readonly<Record<ErrorCode, string>> = {
  BadRequest: 'The request could not be processed.',
  Validation: 'The request is invalid.',
  Unauthorized: 'Authentication is required.',
  Forbidden: 'You do not have access to this resource.',
  MessageAllowanceReached: 'The message allowance has been reached.',
  TwoFactorRequired: 'Two-factor authentication is required.',
  NotFound: 'The requested resource was not found.',
  Conflict: 'The request conflicts with the current state of the resource.',
  LastAdmin: 'The last remaining Admin cannot be changed.',
  NotEligibleForAdmin: 'This user is not eligible to be an Admin.',
  PayloadTooLarge: 'The request is too large.',
  TooManyRequests: 'Too many requests. Please try again later.',
  Internal: GENERIC_ERROR_MESSAGE,
};
