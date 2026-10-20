import type { FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { MessageAllowanceReachedError } from '@nebula-chat/errors';
import { getMessageAllowance } from '@backend/modules/chat/chat.messageAllowance.service';
import { getSessionData } from '@backend/plugins/authGate.plugin';

/**
 * Enforces the message allowance (ADR-0010 §4) on the send path. Runs after
 * `requireAuthentication` (so the session is attached), so a capped Guest is
 * rejected with a `403 MessageAllowanceReached` before the Message is persisted
 * or any job is enqueued.
 *
 * - Verified Registered users are uncapped — the check is skipped entirely. An
 *   unverified one stays metered like a Guest until they verify (ADR-0021).
 * - Otherwise the user's live `role='user'` message count is compared against
 *   `GUEST_MESSAGE_ALLOWANCE`; at or above the cap the send is rejected.
 *
 * The metered decision and the count come from `getMessageAllowance`, the same
 * function `GET /api/chat/message-allowance` answers with, so the two cannot drift.
 */
export const messageAllowanceHook: preHandlerAsyncHookHandler = async (req: FastifyRequest) => {
  const allowance = await getMessageAllowance(getSessionData(req).user);
  if (allowance.metered && allowance.remaining === 0) {
    throw new MessageAllowanceReachedError(allowance.limit);
  }
};
