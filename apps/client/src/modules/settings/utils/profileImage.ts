import { AppError } from '@nebula-chat/errors';
import { resources } from '@/resources';

const { errors } = resources.settings.profile.image;

/** The image types the server accepts, also the file picker's filter. */
export const PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** The largest file the server accepts, before it processes it. */
const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

/** Why `file` would be refused, checked before it is sent; `null` when it may go. */
export const rejectProfileImageFile = (file: File): AppError | null => {
  if (!PROFILE_IMAGE_TYPES.includes(file.type)) return new AppError('BadRequest', errors.wrongType);
  if (file.size > MAX_PROFILE_IMAGE_BYTES) return new AppError('PayloadTooLarge', errors.tooLarge);
  return null;
};

/** What to tell the user about a failed upload or removal. */
export const profileImageErrorMessage = (error: Error): string => {
  if (!(error instanceof AppError)) return errors.failed;
  switch (error.code) {
    case 'BadRequest':
    case 'Validation':
      return errors.wrongType;
    case 'PayloadTooLarge':
      return errors.tooLarge;
    case 'TooManyRequests':
      return errors.rateLimited;
    default:
      return errors.failed;
  }
};
