import { Argument, type Command, InvalidArgumentError, Option } from 'commander';
import { changeLogLevel, getLogLevels } from '@cli/api/generated/operator/operator';
import { ChangeLogLevelBodyComponent } from '@cli/api/generated/model/changeLogLevelBodyComponent';
import { ChangeLogLevelBodyService } from '@cli/api/generated/model/changeLogLevelBodyService';
import { ChangeLogLevelBodyLevel } from '@cli/api/generated/model/changeLogLevelBodyLevel';
import type { ChangeLogLevelBody } from '@cli/api/generated/model/changeLogLevelBody';
import type { LogLevelReport } from '@cli/api/generated/model/logLevelReport';
import { operatorError, operatorTarget } from '@cli/api/operator';
import type { Context } from '@cli/context';
import { UsageError } from '@cli/errors';

const ROOT = 'root';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

type Service = ChangeLogLevelBody['service'] & string;
type SetOptions = { ttl?: number; operator?: string; service: Service };

const serviceOption = () =>
  new Option('--service <service>', 'the service to target')
    .choices(Object.values(ChangeLogLevelBodyService))
    .default('server');

// A worker on the free plan sleeps when idle and then holds no subscription.
const noReceiverHint = (service: Service) =>
  service === 'worker'
    ? ' A worker asleep on the free plan is not listening; it wakes when a job is enqueued.'
    : '';

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

/** The targets whose level is not the same on every instance that answered. */
const disagreements = (reports: LogLevelReport[]) => {
  const levels = new Map<string, Set<string>>();
  for (const { levels: states } of reports) {
    for (const { target, level } of states) {
      levels.set(target, (levels.get(target) ?? new Set()).add(level));
    }
  }
  return [...levels].filter(([, seen]) => seen.size > 1).map(([target]) => target);
};

export const registerLogLevelCommands = (program: Command, ctx: Context) => {
  const logLevel = program
    .command('log-level')
    .description(
      'read or change server or worker log levels at runtime (needs NEBULA_OPERATOR_TOKEN)',
    );

  logLevel
    .command('get')
    .description(
      "show the root level and every component's, as each running instance of the service applies them",
    )
    .addOption(serviceOption())
    .addHelpText(
      'after',
      '\nExample:\n  $ NEBULA_OPERATOR_TOKEN=… nebula log-level get --service worker',
    )
    .action(async (options: { service: Service }) => {
      const { service } = options;
      const { profile, target } = await operatorTarget(ctx);

      const response = await getLogLevels({ service }, { target });
      if (response.status !== 200) throw operatorError(response, profile);

      const { receivers, reports } = response.data;
      const warn = (text: string) => ctx.deps.stderr.write(`warning: ${text}\n`);
      if (reports.length < receivers) {
        warn(
          `${receivers - reports.length} of ${receivers} ${service} instances did not answer in time; their levels are not shown.`,
        );
      }
      const differing = disagreements(reports);
      if (differing.length > 0) {
        warn(`${capitalize(service)} instances disagree on: ${differing.join(', ')}.`);
      }
      const now = ctx.deps.now();
      ctx.print({
        data: response.data,
        view: {
          kind: 'table',
          columns: [
            { key: 'instance', label: 'INSTANCE' },
            { key: 'target', label: 'TARGET' },
            { key: 'level', label: 'LEVEL' },
            { key: 'expires', label: 'EXPIRES' },
            { key: 'operator', label: 'OPERATOR' },
          ],
          rows: reports.flatMap(({ instance, levels }) =>
            levels.map(({ target: name, level, expiresAt, operator }) => ({
              instance,
              target: name,
              level,
              expires:
                expiresAt === null ? '-' : `${expiresAt} (${timeLeft(now, new Date(expiresAt))})`,
              operator: operator ?? '-',
            })),
          ),
          empty:
            receivers === 0
              ? `No ${service} instance is listening for log-level requests.${noReceiverHint(service)}`
              : `No ${service} instance answered in time.`,
        },
      });
    });

  logLevel
    .command('set')
    .description(
      "set the root level, or one component's, on every instance of the service until the TTL runs out",
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
    .addOption(serviceOption())
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
        service: options.service,
        ...(options.ttl === undefined ? {} : { ttlSeconds: options.ttl }),
        operator,
      };

      const response = await changeLogLevel(body, { target });
      if (response.status !== 202) throw operatorError(response, profile);

      const { receivers, expiresAt } = response.data;
      if (receivers === 0) {
        ctx.deps.stderr.write(
          `warning: No ${options.service} instance received the change; none is subscribed to log-level changes.${noReceiverHint(options.service)}\n`,
        );
      }
      ctx.print({
        data: { service: options.service, target: component, level, receivers, expiresAt },
        view: {
          kind: 'fields',
          fields: [
            ['Service', options.service],
            ['Target', component],
            ['Level', level],
            ['Expires at', `${expiresAt} (${timeLeft(ctx.deps.now(), new Date(expiresAt))})`],
            ['Receivers', String(receivers)],
          ],
        },
      });
    });
};
