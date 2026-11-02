import { z } from 'zod';
import type { AuthOutcome, AuthResult } from '@/modules/auth/types/types';
import { AuthRequestError } from '@/modules/auth/utils/AuthRequestError';

const pendingDeletionBody = z.object({
  // better-fetch revives an ISO date in a JSON body into a Date.
  purgeDate: z.union([z.string(), z.date()]).transform((date) => new Date(date).toISOString()),
  restoreToken: z.string().optional(),
});

const bannedBody = z.object({ message: z.string() });

// The server's `bannedUserMessage`: "… Reason: <reason>. The ban ends <ISO date>." or "… The ban has no end."
const BANNED_MESSAGE = /Reason: ([\s\S]*)\. (?:The ban ends (\S+)\.|The ban has no end\.)$/;

/** A sign-in the two-factor plugin held back: no session yet, a code to ask for. */
export const needsSecondFactor = ({ data }: AuthResult) =>
  typeof data === 'object' && data !== null && 'twoFactorRedirect' in data;

/** The outcome a refused sign-in carries in its body, or nothing for an ordinary failure. */
export const authOutcomeOf = (error: Error): AuthOutcome | undefined => {
  if (!(error instanceof AuthRequestError)) return undefined;

  if (error.authCode === 'ACCOUNT_PENDING_DELETION') {
    const body = pendingDeletionBody.safeParse(error.cause);
    return body.success ? { kind: 'pendingDeletion', ...body.data } : undefined;
  }

  if (error.authCode === 'BANNED_USER') {
    const body = bannedBody.safeParse(error.cause);
    const match = body.success ? BANNED_MESSAGE.exec(body.data.message) : null;
    return { kind: 'banned', reason: match?.[1] ?? '', until: match?.[2] ?? null };
  }

  return undefined;
};
