import type { ApiTarget } from '@cli/api/apiFetch';
import type { CliProfile } from '@cli/config/config';
import type { Context } from '@cli/context';
import { AuthError } from '@cli/errors';

/** Admin routes authenticate with the auth session token `nebula login` stored for the profile's server. */
export const adminTarget = async (
  ctx: Context,
): Promise<{ profile: CliProfile; target: ApiTarget }> => {
  const profile = await ctx.profile();
  const token = await ctx.credentials.load(profile.url);
  if (token === undefined) {
    throw new AuthError(`Not logged in to profile '${profile.name}'. Run \`nebula login\`.`);
  }
  return {
    profile,
    target: {
      baseUrl: profile.url,
      fetch: ctx.deps.fetch,
      headers: { Authorization: `Bearer ${token}` },
    },
  };
};
