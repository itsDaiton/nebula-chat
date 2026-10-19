import { Argument, type Command, InvalidArgumentError, Option } from 'commander';
import { changeLogLevel } from '@cli/api/generated/operator/operator';
import { ChangeLogLevelBodyComponent } from '@cli/api/generated/model/changeLogLevelBodyComponent';
import { ChangeLogLevelBodyLevel } from '@cli/api/generated/model/changeLogLevelBodyLevel';
import type { ChangeLogLevelBody } from '@cli/api/generated/model/changeLogLevelBody';
import { operatorError, operatorTarget } from '@cli/api/operator';
import type { Context } from '@cli/context';
import { UsageError } from '@cli/errors';

const ROOT = 'root';

type SetOptions = { ttl?: number; operator?: string };

const parseTtl = (value: string) => {
  const seconds = Number(value);
  if (!/^\d+$/.test(value) || seconds < 1) {
    throw new InvalidArgumentError('Expected a whole number of seconds, at least 1.');
  }
  return seconds;
};

const timeLeft = (from: Date, to: Date) => {
  const seconds = Math.max(0, Math.round((to.getTime() - from.getTime()) / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [h && `${h}h`, m && `${m}m`, (s || seconds === 0) && `${s}s`].filter(Boolean);
  return `in ${parts.join(' ')}`;
};

export const registerLogLevelCommands = (program: Command, ctx: Context) => {
  const logLevel = program
    .command('log-level')
    .description('change server log levels at runtime (needs NEBULA_OPERATOR_TOKEN)');

  logLevel
    .command('set')
    .description(
      "set the root level, or one component's, on every server instance until the TTL runs out",
    )
    .addArgument(
      new Argument('<component>', `a component, or ${ROOT} for the root level`).choices([
        ROOT,
        ...Object.values(ChangeLogLevelBodyComponent),
      ]),
    )
    .addArgument(
      new Argument('<level>', 'the level').choices(Object.values(ChangeLogLevelBodyLevel)),
    )
    .addOption(
      new Option(
        '--ttl <seconds>',
        "how long until the boot-time level returns (the server's default if omitted)",
      ).argParser(parseTtl),
    )
    .option(
      '--operator <name>',
      'who is asking, as the server logs it (default: $NEBULA_OPERATOR, else $USER)',
    )
    .addHelpText(
      'after',
      '\nExample:\n  $ NEBULA_OPERATOR_TOKEN=… nebula log-level set redis debug --ttl 600',
    )
    .action(async (component: string, level: ChangeLogLevelBody['level'], options: SetOptions) => {
      const { profile, target } = await operatorTarget(ctx);
      const { env } = ctx.deps;
      const operator = options.operator ?? env.NEBULA_OPERATOR ?? env.USER ?? env.USERNAME;
      if (!operator?.trim()) {
        throw new UsageError('No operator name to record. Pass --operator <name>.');
      }
      const body: ChangeLogLevelBody = {
        ...(component === ROOT
          ? {}
          : { component: component as ChangeLogLevelBody['component'] & string }),
        level,
        ...(options.ttl === undefined ? {} : { ttlSeconds: options.ttl }),
        operator,
      };

      const response = await changeLogLevel(body, { target });
      if (response.status !== 202) throw operatorError(response, profile);

      const { receivers, expiresAt } = response.data;
      if (receivers === 0) {
        ctx.deps.stderr.write(
          'warning: No server instance received the change; none is subscribed to log-level changes.\n',
        );
      }
      ctx.print({
        data: { target: component, level, receivers, expiresAt },
        view: {
          kind: 'fields',
          fields: [
            ['Target', component],
            ['Level', level],
            ['Expires at', `${expiresAt} (${timeLeft(ctx.deps.now(), new Date(expiresAt))})`],
            ['Receivers', String(receivers)],
          ],
        },
      });
    });
};
