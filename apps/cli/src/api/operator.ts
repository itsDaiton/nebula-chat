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

/** An operator route answers 403 to a wrong token and 404 when the server has none configured. */
export const operatorError = (
  response: { status: number; data: unknown },
  profile: CliProfile,
): CliError => {
  if (response.status === 403) {
    return new AuthError(
      `${profile.url} rejected NEBULA_OPERATOR_TOKEN. Check it matches the server's OPERATOR_TOKEN.`,
    );
  }
  if (response.status === 404) {
    return new AuthError(
      `${profile.url} has no operator token configured (OPERATOR_TOKEN is unset), so operator commands are off.`,
    );
  }
  return responseError(response);
};
