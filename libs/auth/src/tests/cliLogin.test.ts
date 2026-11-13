import { APIError } from 'better-auth/api';
import { describe, expect, it, vi } from 'vitest';
import {
  addDeviceCodeExpiry,
  cliBearerPlugin,
  findCliLoginRefusal,
  markDeviceSessionTwoFactorVerified,
} from '../cliLogin';

const ADMIN = {
  user: {
    isAnonymous: false,
    emailVerified: true,
    banned: false,
    role: 'admin',
    twoFactorEnabled: true,
  },
  session: { twoFactorVerified: true },
};

describe('findCliLoginRefusal', () => {
  it('lets an Admin whose auth session passed two-factor review a code', () => {
    expect(findCliLoginRefusal(ADMIN)).toBeNull();
  });

  it.each([
    ['a Registered user', { role: 'user' }],
    ['a Guest', { role: 'user', isAnonymous: true }],
    ['an unverified Admin', { emailVerified: false }],
    ['a banned Admin', { banned: true }],
  ])('refuses %s as not an Admin', (_who, user) => {
    expect(findCliLoginRefusal({ ...ADMIN, user: { ...ADMIN.user, ...user } })).toBe(
      'ADMIN_REQUIRED',
    );
  });

  it('refuses an Admin without two-factor enabled', () => {
    expect(
      findCliLoginRefusal({ ...ADMIN, user: { ...ADMIN.user, twoFactorEnabled: false } }),
    ).toBe('TWO_FACTOR_REQUIRED');
  });

  it('refuses an Admin whose auth session never passed two-factor', () => {
    expect(findCliLoginRefusal({ ...ADMIN, session: { twoFactorVerified: false } })).toBe(
      'TWO_FACTOR_REQUIRED',
    );
  });
});

describe('markDeviceSessionTwoFactorVerified', () => {
  const hookContext = (returned: unknown) => {
    const updateSession = vi.fn(async () => null);
    return { ctx: { context: { returned, internalAdapter: { updateSession } } }, updateSession };
  };

  it('marks the auth session an approved code is traded for', async () => {
    const { ctx, updateSession } = hookContext({ access_token: 'cli-token', token_type: 'Bearer' });

    await markDeviceSessionTwoFactorVerified(ctx);

    expect(updateSession).toHaveBeenCalledExactlyOnceWith('cli-token', {
      twoFactorVerified: true,
    });
  });

  it('marks nothing while the code is pending, denied or expired', async () => {
    const { ctx, updateSession } = hookContext(
      new APIError('BAD_REQUEST', { error: 'authorization_pending' }),
    );

    await markDeviceSessionTwoFactorVerified(ctx);

    expect(updateSession).not.toHaveBeenCalled();
  });
});

describe('addDeviceCodeExpiry', () => {
  const EXPIRES_AT = new Date('2026-11-13T10:10:00.000Z');

  const hookContext = (returned: unknown, stored: string, userCode: unknown = 'WDJB-MJHT') => {
    const json = vi.fn((body: Record<string, unknown>) => body);
    const findOne = vi.fn(async ({ where }: { where: { value: string }[] }) =>
      where[0]?.value === stored ? { expiresAt: EXPIRES_AT } : null,
    );
    return {
      ctx: {
        query: { user_code: userCode },
        json,
        context: { returned, adapter: { findOne: findOne as never } },
      },
      json,
      findOne,
    };
  };

  const REVIEW = { user_code: 'WDJB-MJHT', status: 'pending', client_id: 'nebula-cli' };

  it('tells the reviewing Admin when the code expires', async () => {
    const { ctx } = hookContext(REVIEW, 'WDJB-MJHT');

    expect(await addDeviceCodeExpiry(ctx)).toEqual({
      ...REVIEW,
      expires_at: '2026-11-13T10:10:00.000Z',
    });
  });

  it('finds a code typed with a dash and in lower case', async () => {
    const { ctx } = hookContext(REVIEW, 'WDJBMJHT', 'wdjb-mjht');

    expect(await addDeviceCodeExpiry(ctx)).toMatchObject({
      expires_at: '2026-11-13T10:10:00.000Z',
    });
  });

  it('adds nothing for someone who is not reviewing the code', async () => {
    const { ctx, json, findOne } = hookContext(
      { user_code: 'WDJB-MJHT', status: 'pending' },
      'WDJB-MJHT',
    );

    await addDeviceCodeExpiry(ctx);

    expect(findOne).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });

  it('adds nothing when the code is unknown or missing', async () => {
    const unknown = hookContext(REVIEW, 'OTHER');
    const missing = hookContext(REVIEW, 'WDJB-MJHT', null);

    await addDeviceCodeExpiry(unknown.ctx);
    await addDeviceCodeExpiry(missing.ctx);

    expect(unknown.json).not.toHaveBeenCalled();
    expect(missing.json).not.toHaveBeenCalled();
  });
});

describe('cliBearerPlugin', () => {
  const matches = (path: string, authorization?: string) => {
    const headers = new Headers(authorization ? { authorization } : {});
    return cliBearerPlugin().hooks?.before?.some(({ matcher }) =>
      matcher({ path, headers } as Parameters<typeof matcher>[0]),
    );
  };

  it.each(['/get-session', '/sign-out'])('reads a bearer token on %s', (path) => {
    expect(matches(path, 'Bearer cli-token')).toBe(true);
  });

  it.each(['/device/approve', '/device', '/delete-user', '/change-password'])(
    'ignores a bearer token on %s, where a guard reads the auth session',
    (path) => {
      expect(matches(path, 'Bearer cli-token')).toBe(false);
    },
  );

  it('stays out of a request without an Authorization header', () => {
    expect(matches('/get-session')).toBe(false);
  });

  it('never answers with the token in a response header', () => {
    expect(cliBearerPlugin().hooks?.after).toBeUndefined();
  });
});
