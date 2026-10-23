// Auth factory + inferred types
export { createAuth } from './auth';
export type {
  CreateAuthConfig,
  AuthInstance,
  OAuthCredentials,
  SessionData,
  Session,
  SocialProviderCredentials,
  User,
} from './auth';

// Account deletion: what of a deleted User lives outside Postgres
export type { DeletedUser, OnUserDeleted } from './userDeletion';

// Session claim (the anonymous → registered handoff, ADR-0010 §2)
export { claimSessions } from './claim';
export type { ClaimSessionsParams } from './claim';

// Transactional email (verification + password reset, ADR-0021)
export { createResendEmailSender } from './resend';
export type {
  CreateResendEmailSenderConfig,
  EmailMessage,
  EmailSender,
  InlineImage,
} from './resend';
