// better-auth 1.7's two-factor plugin leaves no mark on the auth session it signs in, so we mark it ourselves.
// TOTP and backup codes only: ADR-0027 §2 rules out emailed or texted codes.
const TWO_FACTOR_VERIFY_PATHS = new Set([
  '/two-factor/verify-totp',
  '/two-factor/verify-backup-code',
]);

/** The slice of better-auth's after-hook context the marker reads. */
export type TwoFactorHookContext = {
  path: string;
  context: {
    returned?: unknown;
    internalAdapter: {
      updateSession: (token: string, session: { twoFactorVerified: boolean }) => Promise<unknown>;
    };
  };
};

/**
 * After a verify endpoint succeeds, sets `twoFactorVerified` on the auth session it answered with: the one it just
 * created after a sign-in challenge, or the caller's own when they verify a code while already signed in.
 */
export const markTwoFactorVerifiedSession = async ({
  path,
  context,
}: TwoFactorHookContext): Promise<void> => {
  if (!TWO_FACTOR_VERIFY_PATHS.has(path)) return;
  // A failed verify returns an APIError, which carries no token.
  const token = (context.returned as { token?: unknown } | null | undefined)?.token;
  if (typeof token !== 'string') return;
  await context.internalAdapter.updateSession(token, { twoFactorVerified: true });
};
