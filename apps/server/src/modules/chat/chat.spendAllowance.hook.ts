import type { FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { SpendAllowanceReachedError } from '@nebula-chat/errors';
import { getSpendAllowance } from '@server/modules/chat/chat.spendAllowance.service';
import type { SendMessageDTO, SendMessageParams } from '@server/modules/chat/chat.types';
import { providersOf, selectOwnKeys } from '@server/modules/ownKey/ownKey.selection';
import { runRepository } from '@server/modules/run/run.repository';
import { sessionRepository } from '@server/modules/session/session.repository';
import { getSessionData } from '@server/plugins/authGate.plugin';

/**
 * Rejects a verified user who has spent the month's allowance with 403 `SpendAllowanceReached` before anything is persisted.
 * A Message answering a waiting Run continues a Run already started, so it always passes, and a reply
 * whose every provider has a usable Own key is exempt: it spends no Operator key.
 */
export const spendAllowanceHook: preHandlerAsyncHookHandler = async (req: FastifyRequest) => {
  const { user } = getSessionData(req);
  const allowance = await getSpendAllowance(user);
  if (!allowance.capped || allowance.remaining > 0) return;

  const { sessionId } = req.params as SendMessageParams;
  const waiting = await runRepository.findWaiting({ sessionId, userId: user.id });
  if (waiting.length > 0) return;

  // Owner-scoped; a missing Session is left for the send to answer 404.
  const session = await sessionRepository.findByIdSimple(sessionId, user.id);
  if (session) {
    const { model } = req.body as SendMessageDTO;
    const providers = providersOf({ model: model ?? session.model, replyMode: session.replyMode });
    if ((await selectOwnKeys(user.id, providers)).exempt) return;
  }

  throw new SpendAllowanceReachedError(new Date(allowance.resetsAt));
};
