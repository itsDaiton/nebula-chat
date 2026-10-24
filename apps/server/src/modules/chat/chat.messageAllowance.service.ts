import type { User } from '@nebula-chat/auth';
import { env } from '@server/env';
import type { MessageAllowance } from '@server/modules/chat/chat.types';
import { messageRepository } from '@server/modules/message/message.repository';

type AllowanceUser = Pick<User, 'id' | 'isAnonymous' | 'emailVerified'>;

/**
 * The one place that decides whether a user is metered and how much of their
 * Message allowance (ADR-0010 §4) is left. Both the send-path
 * `messageAllowanceHook` and the `GET /api/chat/message-allowance` read call it,
 * so what the client displays and what the server enforces cannot drift.
 *
 * - A verified Registered user is unmetered and short-circuits without touching
 *   the database. A Guest, or a Registered user still unverified (ADR-0021), is
 *   metered.
 * - `used` is the live `role='user'` message count, raw; `remaining` is clamped
 *   at 0, since lowering `GUEST_MESSAGE_ALLOWANCE` can leave `used` above `limit`.
 */
export const getMessageAllowance = async (user: AllowanceUser): Promise<MessageAllowance> => {
  if (!user.isAnonymous && user.emailVerified) {
    return { metered: false };
  }

  const limit = env.GUEST_MESSAGE_ALLOWANCE;
  const used = await messageRepository.countUserMessagesByOwner(user.id);
  return { metered: true, limit, used, remaining: Math.max(0, limit - used) };
};
