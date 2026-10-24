import type { FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { MessageAllowanceReachedError } from '@nebula-chat/errors';
import { getMessageAllowance } from '@server/modules/chat/chat.messageAllowance.service';
import { getSessionData } from '@server/plugins/authGate.plugin';

/**
 * Rejects a metered user over the allowance with 403 `MessageAllowanceReached` before anything is persisted (ADR-0010 §4).
 * It uses `getMessageAllowance`, so it cannot drift from `GET /api/chat/message-allowance`.
 */
export const messageAllowanceHook: preHandlerAsyncHookHandler = async (req: FastifyRequest) => {
  const allowance = await getMessageAllowance(getSessionData(req).user);
  if (allowance.metered && allowance.remaining === 0) {
    throw new MessageAllowanceReachedError(allowance.limit);
  }
};
