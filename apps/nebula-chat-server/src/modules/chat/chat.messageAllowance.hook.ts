import type { FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { env } from '@backend/env';
import { ForbiddenError } from '@backend/errors/AppError';
import type { CreateChatStreamDTO } from '@backend/modules/chat/chat.types';
import { messageRepository } from '@backend/modules/message/message.repository';
import { getSessionData } from '@backend/plugins/authGate.plugin';

/**
 * Enforces the Guest message allowance (ADR-0010 §4) on the chat send path. Runs
 * after `requireAuthentication` (so the session is attached) and before the cache hook, so a
 * capped Guest is rejected with a `403 Forbidden` before any model or cache work
 * happens.
 *
 * - Registered users are uncapped — the check is skipped entirely.
 * - Regenerations do not count and are always allowed (they replay an existing
 *   exchange rather than authoring a new `user` message).
 * - Otherwise the Guest's live `role='user'` message count is compared against
 *   `GUEST_MESSAGE_ALLOWANCE`; at or above the cap the send is rejected.
 */
export const messageAllowanceHook: preHandlerAsyncHookHandler = async (req: FastifyRequest) => {
  const { user } = getSessionData(req);

  if (!user.isAnonymous) {
    return;
  }

  const body = req.body as CreateChatStreamDTO;
  if (body.regenerate) {
    return;
  }

  const userMessageCount = await messageRepository.countUserMessagesByOwner(user.id);
  if (userMessageCount >= env.GUEST_MESSAGE_ALLOWANCE) {
    throw new ForbiddenError('Guest message allowance reached. Register or sign in to continue.');
  }
};
