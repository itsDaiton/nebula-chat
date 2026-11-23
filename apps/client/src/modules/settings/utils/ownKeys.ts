import { AppError } from '@nebula-chat/errors';
import { resources } from '@/resources';

const { errors } = resources.settings.ownKeys;

/** What to tell the user about a failed save. */
export const ownKeyErrorMessage = (error: Error): string => {
  if (!(error instanceof AppError)) return errors.failed;
  switch (error.code) {
    case 'TooManyRequests':
      return errors.rateLimited;
    case 'Forbidden':
      return errors.forbidden;
    default:
      return errors.failed;
  }
};
