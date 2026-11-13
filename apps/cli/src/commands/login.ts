import type { Command } from 'commander';
import { adminTarget } from '@cli/api/admin';
import {
  getAuthSessionUser,
  pollDeviceToken,
  requestDeviceCode,
  signOut,
  type AuthSessionUser,
} from '@cli/api/auth';
import type { ApiTarget } from '@cli/api/apiFetch';
import type { CliProfile } from '@cli/config/config';
import type { Context } from '@cli/context';
import { AuthError } from '@cli/errors';

// RFC 8628 §3.5: a `slow_down` adds 5 seconds to every later interval.
const SLOW_DOWN_MS = 5000;

// WDJBMJHT reads as WDJB-MJHT; the server matches it with or without the dash.
const formatUserCode = (code: string) =>
  code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;

const roleLabel = (user: AuthSessionUser) => (user.role === 'admin' ? 'Admin' : 'User');

const loggedOutError = (profile: CliProfile) =>
  new AuthError(
    `The login for profile '${profile.name}' has expired or was revoked. Run \`nebula login\` again.`,
  );

const waitForApproval = async (
  ctx: Context,
  target: ApiTarget,
  code: { device_code: string; expires_in: number; interval: number },
): Promise<string> => {
  const expired = new AuthError(
    'The code expired before it was approved. Run `nebula login` again.',
  );
  const deadline = ctx.deps.now().getTime() + code.expires_in * 1000;
  let interval = code.interval * 1000;
  for (;;) {
    await ctx.deps.sleep(interval);
    if (ctx.deps.now().getTime() >= deadline) throw expired;
    const poll = await pollDeviceToken(target, code.device_code);
    if (poll.status === 'approved') return poll.token;
    if (poll.status === 'access_denied') {
      throw new AuthError('The sign-in was denied in the browser. Nothing was stored.');
    }
    if (poll.status === 'expired_token') throw expired;
    if (poll.status === 'slow_down') interval += SLOW_DOWN_MS;
  }
};

export const registerLoginCommands = (program: Command, ctx: Context) => {
  program
    .command('login')
    .description('log in as an Admin by approving a code in the browser (two-factor applies there)')
    .option('--no-browser', 'print the URL without opening a browser')
    .addHelpText('after', '\nExample:\n  $ nebula --profile prod login')
    .action(async (options: { browser: boolean }) => {
      const profile = await ctx.profile();
      const target = { baseUrl: profile.url, fetch: ctx.deps.fetch, headers: {} };

      const code = await requestDeviceCode(target);
      // On stderr, so `--json` still prints exactly one document to stdout.
      ctx.deps.stderr.write(
        `Your one-time code: ${formatUserCode(code.user_code)}\n` +
          `Approve it as an Admin at: ${code.verification_uri_complete}\n`,
      );
      if (options.browser) {
        await ctx.deps
          .openBrowser(code.verification_uri_complete)
          .then(() => ctx.deps.stderr.write('Opened your browser.\n'))
          .catch(() => ctx.deps.stderr.write('Could not open a browser; open the URL yourself.\n'));
      }
      ctx.deps.stderr.write('Waiting for approval…\n');

      const token = await waitForApproval(ctx, target, code);
      const storage = await ctx.credentials.save(profile.url, token);
      const user = await getAuthSessionUser({
        ...target,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (user === null) throw loggedOutError(profile);

      ctx.print({
        data: { profile: profile.name, url: profile.url, user, storage },
        view: {
          kind: 'message',
          text: `Logged in to '${profile.name}' as ${user.email} (${roleLabel(user)}). The token is stored in ${
            storage === 'keychain' ? 'the OS keychain' : 'credentials.json (no keychain available)'
          }.`,
        },
      });
    });

  program
    .command('whoami')
    .description("show who the profile's login acts as")
    .addHelpText('after', '\nExample:\n  $ nebula whoami')
    .action(async () => {
      const { profile, target } = await adminTarget(ctx);

      const user = await getAuthSessionUser(target);
      if (user === null) throw loggedOutError(profile);

      ctx.print({
        data: { profile: profile.name, url: profile.url, user },
        view: {
          kind: 'fields',
          fields: [
            ['User', `${user.name} <${user.email}>`],
            ['Role', roleLabel(user)],
            ['Profile', `${profile.name} (${profile.url})`],
          ],
        },
      });
    });

  program
    .command('logout')
    .description("end the profile's auth session on the server and delete the stored token")
    .addHelpText('after', '\nExample:\n  $ nebula logout')
    .action(async () => {
      const profile = await ctx.profile();
      const token = await ctx.credentials.load(profile.url);
      if (token === undefined) {
        ctx.print({
          data: { profile: profile.name, loggedOut: false },
          view: { kind: 'message', text: `Not logged in to profile '${profile.name}'.` },
        });
        return;
      }

      try {
        await signOut({
          baseUrl: profile.url,
          fetch: ctx.deps.fetch,
          headers: { Authorization: `Bearer ${token}` },
        });
      } finally {
        // Deleted even when the server can't be reached, so the machine never keeps a token it was told to drop.
        await ctx.credentials.remove(profile.url);
      }

      ctx.print({
        data: { profile: profile.name, loggedOut: true },
        view: { kind: 'message', text: `Logged out of profile '${profile.name}'.` },
      });
    });
};
