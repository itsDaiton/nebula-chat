# ADR-0021: Resend sends the transactional auth email

- **Status:** Accepted — implemented by NEB-341 (#341)
- **Date:** 2026-10-04
- **Deciders:** @itsDaiton
- **Related:** [ADR-0010](./0010-better-auth-for-auth.md) — better-auth, and the dependency-injection rule `@nebula-chat/auth` follows

## Context

M-6 shipped email/password auth with no email verification and no password reset: a user who forgets their password has no way back in, and no address is known to be real. better-auth implements both flows but leaves delivery to the app — `emailVerification.sendVerificationEmail` and `emailAndPassword.sendResetPassword` are callbacks that receive a user and a signed link. The project has no mail infrastructure, runs on Render, and needs a provider that is cheap at hobby volume and quick to set up.

Two shapes of provider fit: a managed HTTP API (Resend, Postmark, SendGrid…) or SMTP to any mail server through a client like Nodemailer.

## Decision

**Auth email goes through Resend's HTTP API, behind a provider-agnostic `EmailSender` that the server injects into `createAuth()`.**

1. `@nebula-chat/auth` defines `EmailSender = (message: EmailMessage) => Promise<void>` and `createAuth` takes one as `sendEmail`. better-auth's two callbacks build the message from the lib's own templates (`authEmails.ts`) and hand it to `sendEmail`. The lib still never reads `process.env`.
2. The lib also exports `createResendEmailSender({ apiKey, from })`, the Resend-backed `EmailSender`. It throws when Resend answers with an `error`, since the SDK resolves rather than rejects on a refused email.
3. The server validates `RESEND_API_KEY` and `EMAIL_FROM` in `env.ts` (both required) and passes `createResendEmailSender(...)` into `createAuth()` in `src/auth.ts`.
4. Sends run as better-auth background tasks (`advanced.backgroundTasks`): the response never waits on Resend, so response time does not reveal whether an address has an account, and a failed send is logged by better-auth rather than failing sign-up or the reset request.
5. Verification is sent on sign-up but **not required** to sign in (`requireEmailVerification` is off). Requiring it would stop sign-up from creating a session, and the anonymous plugin's claim (ADR-0010 §2) runs on that session, so a Guest who signs up would lose their conversations. The client shows an unverified Registered user a verify prompt instead.

## Alternatives Considered

- **SMTP via Nodemailer** — works with any provider and avoids lock-in, but needs a mail server or relay credentials, connection pooling and TLS settings, and gives no delivery API or dashboard. More setup and more failure modes for no benefit at this volume.
- **Another HTTP provider (Postmark, SendGrid)** — equivalent in shape. Resend wins on setup time, a free tier that covers the project's volume, and a small typed SDK. The `EmailSender` seam keeps a later switch to one file.
- **Require verification before sign-in** — stronger guarantee, rejected for the claim reason in decision 5.

## Consequences

- **Positive:** password auth is recoverable; addresses can be verified; the provider sits behind one injected function, so tests mock it and a switch rewrites `resend.ts` alone.
- **Negative / Tradeoffs:** a third-party dependency on the auth path, with its own outage risk (a failed send is logged, not retried). `EMAIL_FROM` must be on a domain verified in Resend; until one is, only Resend's sandbox sender works, and it delivers only to the account owner's address. Every environment, local included, needs a `RESEND_API_KEY` to boot.
- **Neutral:** an unverified Registered user keeps full access; verification is a prompt, not a gate.

## Implementation Notes

- Files touched: `libs/auth/src/{auth,authEmails,resend,index}.ts`; `apps/nebula-chat-server/src/{env,auth}.ts`; the client's `/auth/forgot-password`, `/auth/reset-password` and `/auth/verify-email` pages and the verify prompt.
- Migrations required: none — verification and reset tokens use better-auth's existing `verification` storage (Redis, ADR-0010 §3) and the `users.emailVerified` column.
- OpenAPI/contract impact: none — better-auth's routes sit behind the hidden `/api/auth/*` catch-all.
- Rollback plan: drop `sendEmail` and the `emailVerification` / `sendResetPassword` options from `createAuth`, and the two env vars.

## Verification

Lib unit tests assert the Resend payload (client mocked) and the templates; server tests cover the env validation; client RTL + msw tests cover the forgot/reset flow, the verify callback, and expired or invalid links.
