import { type Command, InvalidArgumentError } from 'commander';
import {
  loadConfig,
  profileSummary,
  resolveProfile,
  saveConfig,
  serverUrlSchema,
} from '@cli/config/config';
import type { Context } from '@cli/context';

const parseServerUrl = (value: string) => {
  const parsed = serverUrlSchema.safeParse(value);
  if (!parsed.success) throw new InvalidArgumentError(`'${value}' is not an http(s) URL.`);
  return parsed.data;
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
        data: profileSummary(config, name, url),
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
      const profiles = Object.entries(config.profiles).map(([name, { url }]) =>
        profileSummary(config, name, url),
      );
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
      const { url } = resolveProfile(config, name);
      config.defaultProfile = name;
      await saveConfig(ctx.configFile, config);
      ctx.print({
        data: profileSummary(config, name, url),
        view: { kind: 'message', text: `Now using profile '${name}' (${url}).` },
      });
    });
};
