import { describe, expect, it, vi } from 'vitest';
import { dropAdminTrustDevice, flagCanTrustDevice } from '../adminTrustDevice';

const guardContext = ({
  path = '/two-factor/verify-totp',
  body = { code: '123456', trustDevice: true } as unknown,
  cookie = '2fa-challenge' as string | null,
  challengeUserId = 'user-1' as string | null,
  role = 'admin' as string | null,
} = {}) => {
  const getSignedCookie = vi.fn(async () => cookie);
  return {
    getSignedCookie,
    ctx: {
      path,
      body,
      getSignedCookie,
      context: {
        secret: 'secret',
        createAuthCookie: (name: string) => ({ name: `better-auth.${name}` }),
        internalAdapter: {
          findVerificationValue: async (identifier: string) =>
            identifier === cookie && challengeUserId ? { value: challengeUserId } : null,
          findUserById: async (id: string) => (id === challengeUserId ? { role } : null),
        },
      },
    },
  };
};

describe('dropAdminTrustDevice', () => {
  it.each(['/two-factor/verify-totp', '/two-factor/verify-backup-code'])(
    'drops trustDevice when %s answers an Admin’s challenge',
    async (path) => {
      const { ctx, getSignedCookie } = guardContext({ path });

      expect(await dropAdminTrustDevice(ctx)).toEqual({
        context: { body: { code: '123456', trustDevice: false } },
      });
      expect(getSignedCookie).toHaveBeenCalledWith('better-auth.two_factor', 'secret');
    },
  );

  it('keeps trustDevice for a User', async () => {
    const { ctx } = guardContext({ role: 'user' });

    expect(await dropAdminTrustDevice(ctx)).toBeUndefined();
  });

  it('leaves a verify that asks for no trusted device alone', async () => {
    const { ctx, getSignedCookie } = guardContext({ body: { code: '123456' } });

    expect(await dropAdminTrustDevice(ctx)).toBeUndefined();
    expect(getSignedCookie).not.toHaveBeenCalled();
  });

  it('leaves a signed-in verify, which has no challenge cookie, to better-auth', async () => {
    const { ctx } = guardContext({ cookie: null });

    expect(await dropAdminTrustDevice(ctx)).toBeUndefined();
  });

  it('leaves an expired challenge to better-auth’s own rejection', async () => {
    const { ctx } = guardContext({ challengeUserId: null });

    expect(await dropAdminTrustDevice(ctx)).toBeUndefined();
  });

  it.each(['/two-factor/verify-otp', '/sign-in/email'])('ignores %s', async (path) => {
    const { ctx, getSignedCookie } = guardContext({ path });

    expect(await dropAdminTrustDevice(ctx)).toBeUndefined();
    expect(getSignedCookie).not.toHaveBeenCalled();
  });
});

const flagContext = ({
  path = '/sign-in/email',
  returned = { twoFactorRedirect: true, twoFactorMethods: ['totp'] } as unknown,
  role = 'admin' as string | null,
  found = true,
} = {}) => {
  const json = vi.fn((body: Record<string, unknown>) => body);
  const findUserByEmail = vi.fn(async () => (found ? { user: { role } } : null));
  return {
    json,
    findUserByEmail,
    ctx: {
      path,
      body: { email: 'ada@example.com', password: 'secret-password' },
      json,
      context: { returned, internalAdapter: { findUserByEmail } },
    },
  };
};

describe('flagCanTrustDevice', () => {
  it('tells the client an Admin cannot trust the device', async () => {
    const { ctx, findUserByEmail } = flagContext();

    expect(await flagCanTrustDevice(ctx)).toEqual({
      twoFactorRedirect: true,
      twoFactorMethods: ['totp'],
      canTrustDevice: false,
    });
    expect(findUserByEmail).toHaveBeenCalledWith('ada@example.com');
  });

  it('tells the client a User can trust the device', async () => {
    const { ctx } = flagContext({ role: 'user' });

    expect(await flagCanTrustDevice(ctx)).toMatchObject({ canTrustDevice: true });
  });

  it('leaves a sign-in without a challenge alone', async () => {
    const { ctx, json } = flagContext({ returned: { token: 't', user: {} } });

    expect(await flagCanTrustDevice(ctx)).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it('leaves another path alone', async () => {
    const { ctx, json } = flagContext({ path: '/sign-up/email' });

    expect(await flagCanTrustDevice(ctx)).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });
});
