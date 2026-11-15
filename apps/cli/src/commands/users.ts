import { Option, type Command } from 'commander';
import type { ApiTarget } from '@cli/api/apiFetch';
import { adminTarget } from '@cli/api/admin';
import { getUser, listUsers } from '@cli/api/generated/admin/admin';
import { ListUsersSortBy } from '@cli/api/generated/model/listUsersSortBy';
import { ListUsersStatusItem } from '@cli/api/generated/model/listUsersStatusItem';
import { responseError } from '@cli/api/responseError';
import type { Context } from '@cli/context';
import { AuthError, CliError, UsageError } from '@cli/errors';

const envelopeField = (data: unknown, field: 'error' | 'message') =>
  typeof data === 'object' && data !== null && field in data
    ? (data as Record<string, unknown>)[field]
    : undefined;

const adminError = (response: { status: number; data: unknown }): CliError => {
  const { status, data } = response;
  if (status === 401) {
    return new AuthError('The login is no longer valid. Run `nebula login`.');
  }
  if (status === 403) {
    return new AuthError(
      envelopeField(data, 'error') === 'TwoFactorRequired'
        ? 'This Admin has not passed two-factor authentication. Enable 2FA on the account, then run `nebula login` again.'
        : 'This account is not an Admin, so it cannot read Users. Run `nebula login` as an Admin.',
    );
  }
  if (status === 404) {
    const message = envelopeField(data, 'message');
    return new CliError(typeof message === 'string' ? message : 'User not found');
  }
  return responseError(response);
};

const parseLimit = (value: string): number => {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new UsageError('--limit must be a whole number from 1 to 100.');
  }
  return limit;
};

// The detail route takes an id only, so an email is resolved through the list's search.
const findIdByEmail = async (email: string, target: ApiTarget): Promise<string> => {
  let cursor: string | undefined;
  // The search is a substring match, so the exact email can sit on a later page.
  do {
    const response = await listUsers(
      {
        search: email,
        status: Object.values(ListUsersStatusItem),
        limit: 100,
        ...(cursor !== undefined && { cursor }),
      },
      { target },
    );
    if (response.status !== 200) throw adminError(response);
    const match = response.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (match !== undefined) return match.id;
    cursor = response.data.nextCursor ?? undefined;
  } while (cursor !== undefined);
  throw new CliError(`No User with the email ${email}.`);
};

export const registerUsersCommands = (program: Command, ctx: Context) => {
  const users = program
    .command('users')
    .description('read Users as an Admin (needs `nebula login`)');

  users
    .command('list')
    .description(
      'list Users (newest first unless --sort); Guests are left out unless --status guest',
    )
    .option('--search <text>', 'text to find in the name or email')
    .addOption(
      new Option('--status <status...>', 'only Users in one of these statuses').choices(
        Object.values(ListUsersStatusItem),
      ),
    )
    .addOption(
      new Option('--sort <field>', 'what to sort by').choices(Object.values(ListUsersSortBy)),
    )
    .option('--limit <n>', 'how many Users to fetch, 1-100 (default 10)', parseLimit)
    .option('--cursor <cursor>', "the previous page's next cursor")
    .addHelpText(
      'after',
      '\nExample:\n  $ nebula users list --status banned --json | jq -r ".users[].email"',
    )
    .action(
      async (options: {
        search?: string;
        status?: ListUsersStatusItem[];
        sort?: ListUsersSortBy;
        limit?: number;
        cursor?: string;
      }) => {
        const { target } = await adminTarget(ctx);

        const response = await listUsers(
          {
            ...(options.search !== undefined && { search: options.search }),
            ...(options.status !== undefined && { status: options.status }),
            ...(options.sort !== undefined && { sortBy: options.sort }),
            ...(options.limit !== undefined && { limit: options.limit }),
            ...(options.cursor !== undefined && { cursor: options.cursor }),
          },
          { target },
        );
        if (response.status !== 200) throw adminError(response);

        const { users: page, nextCursor } = response.data;
        ctx.print({
          data: response.data,
          view: {
            kind: 'table',
            columns: [
              { key: 'id', label: 'ID' },
              { key: 'email', label: 'EMAIL' },
              { key: 'name', label: 'NAME' },
              { key: 'status', label: 'STATUS' },
              { key: 'sessions', label: 'SESSIONS' },
              { key: 'messages', label: 'MESSAGES' },
              { key: 'createdAt', label: 'CREATED' },
            ],
            rows: page.map((user) => ({
              id: user.id,
              email: user.email,
              name: user.name,
              status: user.status,
              sessions: String(user.sessionsCount),
              messages: String(user.messagesSent),
              createdAt: user.createdAt,
            })),
            empty: 'No Users match.',
          },
        });
        // On stderr, so a piped table stays clean; `--json` carries `nextCursor` itself.
        if (nextCursor !== null) {
          ctx.deps.stderr.write(`More Users: pass --cursor ${nextCursor}\n`);
        }
      },
    );

  users
    .command('show')
    .description('show one User by id or email')
    .argument('<id|email>', "the User's id or email")
    .addHelpText('after', '\nExample:\n  $ nebula users show dana@example.com')
    .action(async (idOrEmail: string) => {
      const { target } = await adminTarget(ctx);

      const id = idOrEmail.includes('@') ? await findIdByEmail(idOrEmail, target) : idOrEmail;
      const response = await getUser(encodeURIComponent(id), { target });
      if (response.status !== 200) throw adminError(response);

      const user = response.data;
      ctx.print({
        data: user,
        view: {
          kind: 'fields',
          fields: [
            ['ID', user.id],
            ['Email', user.email],
            ['Name', user.name],
            ['Status', user.status],
            ['Two-factor', user.twoFactorEnabled ? 'enabled' : 'off'],
            ['Sessions', String(user.sessionsCount)],
            ['Messages sent', String(user.messagesSent)],
            ['Created', user.createdAt],
            ['Updated', user.updatedAt],
            ...(user.ban === null
              ? []
              : ([
                  ['Ban reason', user.ban.reason ?? '-'],
                  ['Ban expires', user.ban.expiresAt ?? 'never'],
                ] as [string, string][])),
            ...(user.pendingDeletionAt === null
              ? []
              : ([['Deletion pending since', user.pendingDeletionAt]] as [string, string][])),
          ],
        },
      });
    });
};
