import type { onRequestAsyncHookHandler } from 'fastify';
import { TooManyRequestsError } from '@nebula-chat/errors';
import { getSessionData } from '@server/plugins/authGate.plugin';
import { redis } from '@server/redis';

/** Saves a User may make per window; each one costs a provider call to validate, so the endpoint cannot probe keys. */
const OWN_KEY_WRITE_LIMIT = 10;

const WINDOW_SECONDS = 60 * 60;

// After the `registered` gate; the count lives in Redis so the limit holds across instances.
export const limitOwnKeyWrites: onRequestAsyncHookHandler = async (req) => {
  const { user } = getSessionData(req);
  const writes = await redis.authStore.increment(`own-key-writes:${user.id}`, WINDOW_SECONDS);
  if (writes > OWN_KEY_WRITE_LIMIT) {
    throw new TooManyRequestsError(
      `You can save at most ${OWN_KEY_WRITE_LIMIT} API keys an hour. Try again later.`,
    );
  }
};
