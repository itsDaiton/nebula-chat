/** Why a reset's new password is refused; the codes the client maps to field errors. */
export type ResetPasswordRejection = 'PASSWORD_COMPROMISED' | 'PASSWORD_REUSED';

export const RESET_PASSWORD_REJECTION_MESSAGES: Record<ResetPasswordRejection, string> = {
  PASSWORD_COMPROMISED:
    'The password you entered has been compromised. Please choose a different password.',
  PASSWORD_REUSED: 'Choose a password different from your current one.',
};

/** A stored reset token; Redis returns the expiry as a JSON string. */
type ResetToken = { userId: string; expiresAt: Date | string };

/** What the guard reads, injected so it runs without a better-auth instance. */
export type ResetPasswordChecks = {
  findResetToken: (token: string) => Promise<ResetToken | null>;
  /** The user's current credential password hash, or null when they have none. */
  findPasswordHash: (userId: string) => Promise<string | null>;
  verifyPassword: (hash: string, password: string) => Promise<boolean>;
  isPasswordCompromised: (password: string) => Promise<boolean>;
  now?: () => Date;
};

/**
 * Why `newPassword` must be refused, or null. better-auth consumes the token before it
 * hashes (and breach-checks) the password, so a refusal there burns the link; this runs first.
 */
export const findResetPasswordRejection = async (
  { token, newPassword }: { token: string; newPassword: string },
  checks: ResetPasswordChecks,
): Promise<ResetPasswordRejection | null> => {
  const resetToken = await checks.findResetToken(token);
  const now = checks.now?.() ?? new Date();
  // An unknown or expired token is better-auth's to reject, as INVALID_TOKEN.
  if (!resetToken || new Date(resetToken.expiresAt) <= now) return null;

  if (await checks.isPasswordCompromised(newPassword)) return 'PASSWORD_COMPROMISED';

  const hash = await checks.findPasswordHash(resetToken.userId);
  if (hash && (await checks.verifyPassword(hash, newPassword))) return 'PASSWORD_REUSED';

  return null;
};
