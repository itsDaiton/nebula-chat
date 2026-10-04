// Auth factory + inferred types
export { createAuth } from './auth';
export type { CreateAuthConfig, AuthInstance, SessionData, Session, User } from './auth';

// Conversation claim (the anonymous → registered handoff, ADR-0010 §2)
export { claimConversations } from './claim';
export type { ClaimConversationsParams } from './claim';

// Transactional email (verification + password reset, ADR-0021)
export { createResendEmailSender } from './resend';
export type { CreateResendEmailSenderConfig, EmailMessage, EmailSender } from './resend';
