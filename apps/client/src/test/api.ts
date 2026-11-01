import { HttpResponse, http, type HttpHandler, type JsonBodyType } from 'msw';

/**
 * Orval's MSW handlers cover only success responses and match any origin; this module adds the failure responses, the plain-string `/api/streams/:streamId`
 * and better-auth's `/api/auth/*` (absent from the spec), keeping the origin wildcard in one place.
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
  authTwoFactorEnable: '*/api/auth/two-factor/enable',
  authTwoFactorVerifyTotp: '*/api/auth/two-factor/verify-totp',
  authTwoFactorDisable: '*/api/auth/two-factor/disable',
  authTwoFactorBackupCodes: '*/api/auth/two-factor/generate-backup-codes',
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
