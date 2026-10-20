import { HttpResponse, http, type HttpHandler, type JsonBodyType } from 'msw';

/**
 * Orval generates one MSW handler per documented **success** response, matching
 * any origin (`*​/api/...`), so a test never names a host and never restates a
 * path the OpenAPI spec already defines. Import those directly:
 *
 * ```ts
 * import { getListSessionsMockHandler } from '@/libs/api/generated/sessions/sessions.msw';
 * server.use(getListSessionsMockHandler({ sessions, nextCursor: null, hasMore: false }));
 * ```
 *
 * Failure responses have no generated handler, `/api/streams/:streamId`'s returns a plain
 * string rather than SSE frames, and better-auth's `/api/auth/*` is absent from the
 * OpenAPI spec. This module covers exactly that gap, keeping the origin wildcard in one place.
 */
export const API_ROUTE = {
  sessions: '*/api/sessions',
  sessionsSearch: '*/api/sessions/search',
  session: '*/api/sessions/:sessionId',
  sendMessage: '*/api/sessions/:sessionId/messages',
  replyStream: '*/api/streams/:streamId',
  messageAllowance: '*/api/chat/message-allowance',
  profileImage: '*/api/profile-image',
  authSession: '*/api/auth/get-session',
  authSignInAnonymous: '*/api/auth/sign-in/anonymous',
  authSignInEmail: '*/api/auth/sign-in/email',
  authSignUpEmail: '*/api/auth/sign-up/email',
  authSignInSocial: '*/api/auth/sign-in/social',
  authSignOut: '*/api/auth/sign-out',
  authRequestPasswordReset: '*/api/auth/request-password-reset',
  authResetPassword: '*/api/auth/reset-password',
  authChangePassword: '*/api/auth/change-password',
  authUpdateUser: '*/api/auth/update-user',
  authRevokeSessions: '*/api/auth/revoke-sessions',
  authDeleteUser: '*/api/auth/delete-user',
  authListAccounts: '*/api/auth/list-accounts',
  authSendVerificationEmail: '*/api/auth/send-verification-email',
} as const;

type Method = 'get' | 'post' | 'put' | 'delete';

/** A JSON error response for a route Orval only documents on the happy path. */
export const mockApiError = (
  method: Method,
  route: string,
  status: number,
  body: JsonBodyType = {},
): HttpHandler => http[method](route, () => HttpResponse.json(body, { status }));
