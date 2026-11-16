import { z } from 'zod';
import type { AuthOutcome, AuthResult, SocialSignInLanding } from '@/modules/auth/types/types';
import { AuthRequestError } from '@/modules/auth/utils/AuthRequestError';

const pendingDeletionBody = z.object({
  // better-fetch revives an ISO date in a JSON body into a Date.
  purgeDate: z.union([z.string(), z.date()]).transform((date) => new Date(date).toISOString()),
  restoreToken: z.string(),
});

const secondFactorData = z.object({
  twoFactorRedirect: z.literal(true),
  canTrustDevice: z.boolean().optional(),
});

const bannedBody = z.object({ message: z.string() });

// The server's `bannedUserMessage`: "… Reason: <reason>. The ban ends <ISO date>." or "… The ban has no end."
const BANNED_MESSAGE = /Reason: ([\s\S]*)\. (?:The ban ends (\S+)\.|The ban has no end\.)$/;
// What that message says when the Admin gave none.
const NO_REASON = 'No reason';

/** The ban a refused sign-in's message describes; a social sign-in brings it back as `?error_description=`. */
const bannedOutcome = (message: string): AuthOutcome => {
  const [, reason = '', until = null] = BANNED_MESSAGE.exec(message) ?? [];
  return { kind: 'banned', reason: reason === NO_REASON ? '' : reason, until };
};

// A social sign-in redirects a User in Pending deletion back with the Purge date and token, a banned one with its
// message. A hand-edited date is ignored rather than crashing the page.
export const socialSignInOutcome = ({
  pending,
  restoreToken,
  error,
  errorDescription,
}: SocialSignInLanding): AuthOutcome | null => {
  if (pending && restoreToken && !Number.isNaN(Date.parse(pending))) {
    return { kind: 'pendingDeletion', purgeDate: pending, restoreToken };
  }
  if (error === 'BANNED_USER') return bannedOutcome(errorDescription ?? '');
  return null;
};

/** A sign-in the two-factor plugin held back: no session yet, a code to ask for. */
export const secondFactorOutcome = ({ data }: AuthResult): AuthOutcome | undefined => {
  const challenge = secondFactorData.safeParse(data);
  if (!challenge.success) return undefined;
  return { kind: 'twoFactor', canTrustDevice: challenge.data.canTrustDevice !== false };
};

/** The outcome a refused sign-in carries in its body, or nothing for an ordinary failure. */
export const authOutcomeOf = (error: Error): AuthOutcome | undefined => {
  if (!(error instanceof AuthRequestError)) return undefined;

  if (error.authCode === 'ACCOUNT_PENDING_DELETION') {
    const body = pendingDeletionBody.safeParse(error.cause);
    return body.success ? { kind: 'pendingDeletion', ...body.data } : undefined;
  }

  if (error.authCode === 'BANNED_USER') {
    const body = bannedBody.safeParse(error.cause);
    return bannedOutcome(body.success ? body.data.message : '');
  }

  return undefined;
};
