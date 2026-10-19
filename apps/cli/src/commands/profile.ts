import { type Command, InvalidArgumentError } from 'commander';
import { loadConfig, saveConfig } from '@cli/config/config';
import type { Context } from '@cli/context';
import { UsageError } from '@cli/errors';

/** Only http(s), stored without a trailing slash so request paths join onto it cleanly. */
const parseServerUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new InvalidArgumentError(`'${value}' is not an http(s) URL.`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new InvalidArgumentError(`'${value}' is not an http(s) URL.`);
  }
  return url.href.replace(/\/+$/, '');
};

export const registerProfileCommands = (program: Command, ctx: Context) => {
  const profile = program
    .command('profile')
    .description('manage the servers the CLI talks to (one profile per deployment)');

  profile
    .command('add')
    .description('add a profile, or change the URL of an existing one')
    .argument('<name>', 'a name for the deployment, such as local or prod')
    .requiredOption('--url <url>', "the server's base URL", parseServerUrl)
    .addHelpText('after', '\nExample:\n  $ nebula profile add local --url http://localhost:3000')
    .action(async (name: string, { url }: { url: string }) => {
      const config = await loadConfig(ctx.configFile);
      const existed = name in config.profiles;
      config.profiles[name] = { url };
      config.defaultProfile ??= name;
      await saveConfig(ctx.configFile, config);
      ctx.print({
        data: { name, url, default: config.defaultProfile === name },
        view: {
          kind: 'message',
          text: `${existed ? 'Updated' : 'Added'} profile '${name}' (${url}).`,
        },
      });
    });

  profile
    .command('list')
    .description('list the profiles; * marks the default')
    .action(async () => {
      const config = await loadConfig(ctx.configFile);
      const profiles = Object.entries(config.profiles).map(([name, { url }]) => ({
        name,
        url,
        default: config.defaultProfile === name,
      }));
      ctx.print({
        data: profiles,
        view: {
          kind: 'table',
          columns: [
            { key: 'name', label: 'NAME' },
            { key: 'url', label: 'URL' },
            { key: 'default', label: 'DEFAULT' },
          ],
          rows: profiles.map((p) => ({ name: p.name, url: p.url, default: p.default ? '*' : '' })),
          empty: 'No profiles yet. Add one with `nebula profile add <name> --url <url>`.',
        },
      });
    });

  profile
    .command('use')
    .description('make a profile the default')
    .argument('<name>', 'the profile to use from now on')
    .action(async (name: string) => {
      const config = await loadConfig(ctx.configFile);
      const target = config.profiles[name];
      if (target === undefined) {
        throw new UsageError(`Unknown profile '${name}'. See \`nebula profile list\`.`);
      }
      config.defaultProfile = name;
      await saveConfig(ctx.configFile, config);
      ctx.print({
        data: { name, url: target.url, default: true },
        view: { kind: 'message', text: `Now using profile '${name}' (${target.url}).` },
      });
    });
};
