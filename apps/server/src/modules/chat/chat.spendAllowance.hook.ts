import type { FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { SpendAllowanceReachedError } from '@nebula-chat/errors';
import { getSpendAllowance } from '@server/modules/chat/chat.spendAllowance.service';
import type { SendMessageParams } from '@server/modules/chat/chat.types';
import { runRepository } from '@server/modules/run/run.repository';
import { getSessionData } from '@server/plugins/authGate.plugin';

/**
 * Rejects a verified user who has spent the month's allowance with 403 `SpendAllowanceReached` before anything is persisted.
 * A Message answering a waiting Run continues a Run already started, so it always passes.
 */
export const spendAllowanceHook: preHandlerAsyncHookHandler = async (req: FastifyRequest) => {
  const { user } = getSessionData(req);
  const allowance = await getSpendAllowance(user);
  if (!allowance.capped || allowance.remaining > 0) return;

  const { sessionId } = req.params as SendMessageParams;
  const waiting = await runRepository.findWaiting({ sessionId, userId: user.id });
  if (waiting.length > 0) return;

  throw new SpendAllowanceReachedError(new Date(allowance.resetsAt));
};
