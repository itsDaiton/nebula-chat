import type { User } from '@nebula-chat/auth';
import { env } from '@server/env';
import type { MessageAllowance } from '@server/modules/chat/chat.types';
import { messageRepository } from '@server/modules/message/message.repository';

type AllowanceUser = Pick<User, 'id' | 'isAnonymous' | 'emailVerified'>;

/**
 * The one place that decides whether a user is metered and how much allowance is left (ADR-0010 §4, ADR-0021).
 * `remaining` is clamped at 0, since lowering the limit can leave `used` above it.
 */
export const getMessageAllowance = async (user: AllowanceUser): Promise<MessageAllowance> => {
  if (!user.isAnonymous && user.emailVerified) {
    return { metered: false };
  }

  const limit = env.GUEST_MESSAGE_ALLOWANCE;
  const used = await messageRepository.countUserMessagesByOwner(user.id);
  return { metered: true, limit, used, remaining: Math.max(0, limit - used) };
};
