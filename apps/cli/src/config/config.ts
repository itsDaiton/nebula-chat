import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { CliError, UsageError } from '@cli/errors';

/** Only http(s), stored without a trailing slash so request paths join onto it cleanly. */
export const serverUrlSchema = z
  .url({ protocol: /^https?$/ })
  .transform((url) => url.replace(/\/+$/, ''));

const configSchema = z.object({
  defaultProfile: z.string().optional(),
  profiles: z.record(z.string(), z.object({ url: serverUrlSchema })).default({}),
});

export type Config = z.infer<typeof configSchema>;
export type CliProfile = { name: string; url: string };

/** `$XDG_CONFIG_HOME/nebula-chat/config.json`, falling back to `~/.config` as the XDG spec does. */
export const configFilePath = (env: Record<string, string | undefined>, homeDir: string) => {
  const base = env.XDG_CONFIG_HOME?.trim() || join(homeDir, '.config');
  return join(base, 'nebula-chat', 'config.json');
};

export const loadConfig = async (path: string): Promise<Config> => {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { profiles: {} };
    throw err;
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new CliError(`${path} is not valid JSON. Fix or delete it.`);
  }
  const parsed = configSchema.safeParse(json);
  if (!parsed.success) {
    throw new CliError(`${path} is not a valid config file: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
};

/** Written owner-only and swapped in by rename, so a crash mid-write never leaves half a file. */
export const saveConfig = async (path: string, config: Config) => {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  await chmod(temp, 0o600);
  await rename(temp, path);
};

/** The `--profile` one if given, else the default one. */
export const resolveProfile = (config: Config, requested: string | undefined): CliProfile => {
  const name = requested ?? config.defaultProfile;
  if (name === undefined) {
    throw new UsageError(
      'No profile selected. Add one with `nebula profile add <name> --url <url>`, or pass --profile.',
    );
  }
  const profile = config.profiles[name];
  if (profile === undefined) {
    throw new UsageError(`Unknown profile '${name}'. See \`nebula profile list\`.`);
  }
  return { name, url: profile.url };
};

/** A CLI profile as `profile` commands print it. */
export const profileSummary = (config: Config, name: string, url: string) => ({
  name,
  url,
  default: config.defaultProfile === name,
});
