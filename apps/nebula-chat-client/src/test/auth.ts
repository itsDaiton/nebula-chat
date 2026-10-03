/** A better-auth `get-session` body; a Guest unless `isAnonymous` is false. */
export const aSession = ({ isAnonymous = true }: { isAnonymous?: boolean } = {}) => ({
  session: {
    id: 'session-1',
    userId: 'user-1',
    token: 'token-1',
    expiresAt: '2099-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  user: {
    id: 'user-1',
    name: isAnonymous ? 'Anonymous' : 'Ada',
    email: isAnonymous ? 'temp@anonymous.local' : 'ada@example.com',
    emailVerified: false,
    image: null,
    isAnonymous,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
});
