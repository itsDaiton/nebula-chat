import type { ApiTarget } from '@cli/api/apiFetch';
import { responseError } from '@cli/api/responseError';
import type { CliProfile } from '@cli/config/config';
import type { Context } from '@cli/context';
import { AuthError, type CliError } from '@cli/errors';

/**
 * Operator routes authenticate with `NEBULA_OPERATOR_TOKEN`, read from the environment and never
 * stored. Checked before the profile, so a missing token is always the auth error it is.
 */
export const operatorTarget = async (
  ctx: Context,
): Promise<{ profile: CliProfile; target: ApiTarget }> => {
  const token = ctx.deps.env.NEBULA_OPERATOR_TOKEN?.trim();
  if (!token) {
    throw new AuthError(
      "NEBULA_OPERATOR_TOKEN is not set. Export the deployment's operator token (its OPERATOR_TOKEN) to run operator commands.",
    );
  }
  const profile = await ctx.profile();
  return {
    profile,
    target: {
      baseUrl: profile.url,
      fetch: ctx.deps.fetch,
      headers: { Authorization: `Bearer ${token}` },
    },
  };
};

/** An operator route answers 404 to a wrong, missing or unconfigured token alike, so the message names both causes. */
export const operatorError = (
  response: { status: number; data: unknown },
  profile: CliProfile,
): CliError => {
  if (response.status === 404) {
    return new AuthError(
      `${profile.url} rejected NEBULA_OPERATOR_TOKEN, or has none configured (OPERATOR_TOKEN is unset). Check it matches the server's OPERATOR_TOKEN.`,
    );
  }
  return responseError(response);
};
