import { HttpResponse, http, type HttpHandler } from 'msw';
import { API_ROUTE } from '@/test/api';

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

type SessionBody = ReturnType<typeof aSession> | null;

/** Answers `get-session` with `body`, or with what `body` returns for each request. */
export const mockGetSession = (
  body: SessionBody | ((request: Request) => SessionBody),
): HttpHandler =>
  http.get(API_ROUTE.authSession, ({ request }) =>
    HttpResponse.json(typeof body === 'function' ? body(request) : body),
  );

/** Mints a Guest on `sign-in/anonymous`, calling `onRequest` first. */
export const mockAnonymousSignIn = (
  onRequest: (request: Request) => void = () => {},
): HttpHandler =>
  http.post(API_ROUTE.authSignInAnonymous, ({ request }) => {
    onRequest(request);
    return HttpResponse.json({ token: 'token-1', user: aSession().user });
  });
