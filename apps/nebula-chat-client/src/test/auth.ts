import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http, type HttpHandler, type JsonBodyType } from 'msw';
import { expect } from 'vitest';
import { authClient } from '@/libs/auth/client';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { API_ROUTE } from '@/test/api';
import { server } from '@/test/msw';

/** A better-auth `get-session` body; a Guest unless `isAnonymous` is false, unverified unless `emailVerified`. */
export const aSession = ({
  isAnonymous = true,
  emailVerified = false,
}: { isAnonymous?: boolean; emailVerified?: boolean } = {}) => ({
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
    emailVerified,
    image: null,
    isAnonymous,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
});

type SessionBody = ReturnType<typeof aSession> | null;

type SessionOptions = Parameters<typeof aSession>[0];

type OnRequest = (request: Request) => void | Promise<void>;

/** Answers `get-session` with `body`, or with what `body` returns for each request. */
export const mockGetSession = (
  body: SessionBody | ((request: Request) => SessionBody),
): HttpHandler =>
  http.get(API_ROUTE.authSession, ({ request }) =>
    HttpResponse.json(typeof body === 'function' ? body(request) : body),
  );

/** Answers a POST to `route` with `body`, calling `onRequest` first. */
const mockAuthPost =
  (route: string, body: JsonBodyType) =>
  (onRequest: OnRequest = () => {}): HttpHandler =>
    http.post(route, async ({ request }) => {
      await onRequest(request);
      return HttpResponse.json(body);
    });

/** Mints a Guest on `sign-in/anonymous`, calling `onRequest` first. */
export const mockAnonymousSignIn = mockAuthPost(API_ROUTE.authSignInAnonymous, {
  token: 'token-1',
  user: aSession().user,
});

/** Signs in a Registered user on `sign-in/email`, calling `onRequest` first. */
export const mockEmailSignIn = mockAuthPost(API_ROUTE.authSignInEmail, {
  redirect: false,
  token: 'token-1',
  user: aSession({ isAnonymous: false }).user,
});

/** Registers a user on `sign-up/email`, calling `onRequest` first. */
export const mockEmailSignUp = mockAuthPost(API_ROUTE.authSignUpEmail, {
  token: 'token-1',
  user: aSession({ isAnonymous: false }).user,
});

/** Stands in for the provider's consent screen: a hash change, the one navigation jsdom performs. */
export const providerConsentUrl = () => new URL('#provider-consent', window.location.href).href;

/** Starts a social sign-in on `sign-in/social`, calling `onRequest` first; the client then redirects. */
export const mockSocialSignIn = (onRequest: OnRequest = () => {}): HttpHandler =>
  http.post(API_ROUTE.authSignInSocial, async ({ request }) => {
    await onRequest(request);
    return HttpResponse.json({ url: providerConsentUrl(), redirect: true });
  });

/** Ends the session on `sign-out`, calling `onRequest` first. */
export const mockSignOut = mockAuthPost(API_ROUTE.authSignOut, { success: true });

/** Accepts a `request-password-reset`; better-auth answers the same whether or not the email exists. */
export const mockRequestPasswordReset = mockAuthPost(API_ROUTE.authRequestPasswordReset, {
  status: true,
});

/** Sets the new password on `reset-password`. */
export const mockResetPassword = mockAuthPost(API_ROUTE.authResetPassword, { status: true });

/** Changes a Registered user's password on `change-password`; revoking other sessions issues a new token. */
export const mockChangePassword = mockAuthPost(API_ROUTE.authChangePassword, {
  token: 'token-2',
  user: aSession({ isAnonymous: false }).user,
});

/** Resends the verification email on `send-verification-email`. */
export const mockSendVerificationEmail = mockAuthPost(API_ROUTE.authSendVerificationEmail, {
  status: true,
});

/** Refetches the session the way better-auth's own auth calls do; its store outlives a test. */
export const refreshSession = () => act(() => authClient.$store.notify('$sessionSignal'));

/** Serves `aSession(options)` and waits until better-auth's singleton session store holds it. */
export const holdSession = async (options: SessionOptions) => {
  const body = aSession(options);
  const { isAnonymous, emailVerified } = body.user;
  server.use(mockGetSession(body));
  const { result } = renderHook(() => useAuth());
  refreshSession();
  await waitFor(() => expect(result.current.user).toMatchObject({ isAnonymous, emailVerified }));
};
