import type { Command } from 'commander';
import { grantAdmin, listAdmins, revokeAdmin } from '@cli/api/generated/operator/operator';
import { operatorError, operatorTarget } from '@cli/api/operator';
import type { CliProfile } from '@cli/config/config';
import type { Context } from '@cli/context';
import { CliError, UsageError } from '@cli/errors';

const envelopeMessage = (data: unknown) =>
  typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string'
    ? data.message
    : undefined;

/**
 * An unknown email and a server without an operator token are both 404s, told apart by the message.
 * `refused` lists the statuses whose server message is the answer, not a usage or auth problem.
 */
const adminError = (
  response: { status: number; data: unknown },
  profile: CliProfile,
  refused: number[],
): CliError => {
  const message = envelopeMessage(response.data);
  const userNotFound = response.status === 404 && message === 'User not found';
  if (message !== undefined && (userNotFound || refused.includes(response.status))) {
    return new CliError(message);
  }
  return operatorError(response, profile);
};

export const registerAdminsCommands = (program: Command, ctx: Context) => {
  const admins = program
    .command('admins')
    .description('grant, revoke or list Admins (needs NEBULA_OPERATOR_TOKEN)');

  admins
    .command('grant')
    .description('make a verified Registered user an Admin; this is how the first Admin is made')
    .argument('<email>', "the user's email")
    .addHelpText(
      'after',
      '\nExample:\n  $ NEBULA_OPERATOR_TOKEN=… nebula admins grant dana@example.com',
    )
    .action(async (email: string) => {
      const { profile, target } = await operatorTarget(ctx);

      const response = await grantAdmin({ email }, { target });
      if (response.status !== 201) throw adminError(response, profile, [400, 409]);

      const { name, createdAt } = response.data;
      ctx.print({
        data: response.data,
        view: {
          kind: 'fields',
          fields: [
            ['Email', response.data.email],
            ['Name', name],
            ['Granted at', createdAt],
          ],
        },
      });
    });

  admins
    .command('revoke')
    .description('take the Admin role from a user')
    .argument('<email>', "the Admin's email")
    .option('-y, --yes', 'do not ask for confirmation (required in a non-interactive shell)')
    .addHelpText(
      'after',
      '\nExample:\n  $ NEBULA_OPERATOR_TOKEN=… nebula admins revoke dana@example.com --yes',
    )
    .action(async (email: string, options: { yes?: boolean }) => {
      const { profile, target } = await operatorTarget(ctx);

      if (options.yes !== true) {
        if (ctx.deps.stdin.isTTY !== true) {
          throw new UsageError(
            'Refusing to revoke without confirmation in a non-interactive shell. Pass --yes to confirm.',
          );
        }
        if (!(await ctx.deps.confirm(`Take the Admin role from ${email}?`))) {
          throw new CliError('Cancelled; no Admin was revoked.');
        }
      }

      const response = await revokeAdmin(encodeURIComponent(email), { target });
      if (response.status !== 204) throw adminError(response, profile, [409]);

      ctx.print({
        data: { email, revoked: true },
        view: { kind: 'message', text: `${email} is no longer an Admin.` },
      });
    });

  admins
    .command('list')
    .description('list every Admin, oldest account first')
    .addHelpText('after', '\nExample:\n  $ NEBULA_OPERATOR_TOKEN=… nebula admins list')
    .action(async () => {
      const { profile, target } = await operatorTarget(ctx);

      const response = await listAdmins({ target });
      if (response.status !== 200) throw operatorError(response, profile);

      ctx.print({
        data: response.data,
        view: {
          kind: 'table',
          columns: [
            { key: 'email', label: 'EMAIL' },
            { key: 'name', label: 'NAME' },
            { key: 'grantedAt', label: 'GRANTED AT' },
          ],
          rows: response.data.map(({ email, name, createdAt }) => ({
            email,
            name,
            grantedAt: createdAt,
          })),
          empty: 'No Admins yet. Make one with: nebula admins grant <email>',
        },
      });
    });
};
