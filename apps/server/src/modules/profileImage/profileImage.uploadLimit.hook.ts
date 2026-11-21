import type { onRequestAsyncHookHandler } from 'fastify';
import { TooManyRequestsError } from '@nebula-chat/errors';
import { getSessionData } from '@server/plugins/authGate.plugin';
import { redis } from '@server/redis';

/** Uploads a user may make per window: each one costs image processing and a stored file. */
const PROFILE_IMAGE_UPLOAD_LIMIT = 10;

const WINDOW_SECONDS = 60 * 60;

// After the `registered` gate; the count lives in Redis so the limit holds across instances.
export const limitProfileImageUploads: onRequestAsyncHookHandler = async (req) => {
  const { user } = getSessionData(req);
  const uploads = await redis.authStore.increment(
    `profile-image-uploads:${user.id}`,
    WINDOW_SECONDS,
  );
  if (uploads > PROFILE_IMAGE_UPLOAD_LIMIT) {
    throw new TooManyRequestsError(
      `You can upload at most ${PROFILE_IMAGE_UPLOAD_LIMIT} Profile images an hour. Try again later.`,
    );
  }
};
