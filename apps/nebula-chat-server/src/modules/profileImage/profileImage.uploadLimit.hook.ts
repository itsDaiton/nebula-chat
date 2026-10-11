import type { preHandlerAsyncHookHandler } from 'fastify';
import { TooManyRequestsError } from '@nebula-chat/errors';
import { getSessionData } from '@backend/plugins/authGate.plugin';
import { redis } from '@backend/redis';

/** Uploads a user may make per window: each one costs image processing and a stored file. */
const PROFILE_IMAGE_UPLOAD_LIMIT = 10;

const WINDOW_SECONDS = 60 * 60;

/**
 * preHandler, after `requireRegistered`: counts the user's uploads in a fixed one-hour window.
 * The count lives in Redis so the limit holds across server instances.
 */
export const limitProfileImageUploads: preHandlerAsyncHookHandler = async (req) => {
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
