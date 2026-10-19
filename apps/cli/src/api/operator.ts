import type { ApiTarget } from '@cli/api/apiFetch';
import { responseError } from '@cli/api/responseError';
import type { Profile } from '@cli/config/config';
import type { Deps } from '@cli/run';
import { AuthError, type CliError } from '@cli/errors';

/** Operator routes authenticate with `NEBULA_OPERATOR_TOKEN`, read from the environment and never stored. */
export const operatorTarget = (profile: Profile, deps: Deps): ApiTarget => {
  const token = deps.env.NEBULA_OPERATOR_TOKEN?.trim();
  if (!token) {
    throw new AuthError(
      "NEBULA_OPERATOR_TOKEN is not set. Export the deployment's operator token (its OPERATOR_TOKEN) to run operator commands.",
    );
  }
  return { baseUrl: profile.url, fetch: deps.fetch, headers: { Authorization: `Bearer ${token}` } };
};

/** An operator route answers 403 to a wrong token and 404 when the server has none configured. */
export const operatorError = (
  response: { status: number; data: unknown },
  profile: Profile,
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
