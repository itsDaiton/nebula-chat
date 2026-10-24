import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '@server/env';

// message.repository is the boundary the allowance reaches Postgres through (the
// live `role='user'` count); everything else here is the real decision.
vi.mock('@server/modules/message/message.repository', () => ({
  messageRepository: { countUserMessagesByOwner: vi.fn() },
}));

import { getMessageAllowance } from '@server/modules/chat/chat.messageAllowance.service';
import { messageRepository } from '@server/modules/message/message.repository';

const mockedCount = vi.mocked(messageRepository.countUserMessagesByOwner);
const LIMIT = env.GUEST_MESSAGE_ALLOWANCE;
const USER_ID = '77777777-7777-4777-8777-777777777777';

const guest = { id: USER_ID, isAnonymous: true, emailVerified: false };
const unverified = { id: USER_ID, isAnonymous: false, emailVerified: false };
const verified = { id: USER_ID, isAnonymous: false, emailVerified: true };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getMessageAllowance', () => {
  it('meters a Guest against the configured limit with their live count', async () => {
    mockedCount.mockResolvedValue(3);

    await expect(getMessageAllowance(guest)).resolves.toEqual({
      metered: true,
      limit: LIMIT,
      used: 3,
      remaining: LIMIT - 3,
    });
    expect(mockedCount).toHaveBeenCalledWith(USER_ID);
  });

  it('meters a Registered user whose email is unverified like a Guest', async () => {
    mockedCount.mockResolvedValue(0);

    await expect(getMessageAllowance(unverified)).resolves.toEqual({
      metered: true,
      limit: LIMIT,
      used: 0,
      remaining: LIMIT,
    });
  });

  it('leaves a verified Registered user unmetered without counting', async () => {
    await expect(getMessageAllowance(verified)).resolves.toEqual({ metered: false });
    expect(mockedCount).not.toHaveBeenCalled();
  });

  it('reports 0 remaining exactly at the limit', async () => {
    mockedCount.mockResolvedValue(LIMIT);

    await expect(getMessageAllowance(guest)).resolves.toMatchObject({ remaining: 0 });
  });

  it('clamps remaining at 0 but reports the raw count when used exceeds the limit', async () => {
    mockedCount.mockResolvedValue(LIMIT + 4);

    await expect(getMessageAllowance(guest)).resolves.toEqual({
      metered: true,
      limit: LIMIT,
      used: LIMIT + 4,
      remaining: 0,
    });
  });
});
