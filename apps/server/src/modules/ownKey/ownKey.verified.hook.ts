import type { onRequestAsyncHookHandler } from 'fastify';
import { ForbiddenError } from '@nebula-chat/errors';
import { getSessionData } from '@server/plugins/authGate.plugin';

/** Own keys are for verified Registered users: an unverified one is Metered, and a key would skip the allowance that pushes them to verify. */
export const requireVerified: onRequestAsyncHookHandler = async (req) => {
  const { user } = getSessionData(req);
  if (!user.emailVerified) {
    throw new ForbiddenError('Verify your email to use your own API key.');
  }
};
