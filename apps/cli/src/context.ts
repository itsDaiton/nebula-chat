import { configFilePath, loadConfig, resolveProfile } from '@cli/config/config';
import { print, type Result } from '@cli/output/print';
import type { Deps } from '@cli/run';

export type GlobalOptions = { json?: boolean; profile?: string };

/** What every command gets: the deps, the config file, the selected profile and the printer. */
export const createContext = (deps: Deps, options: () => GlobalOptions) => {
  const configFile = configFilePath(deps.env, deps.homeDir);
  return {
    deps,
    configFile,
    options,
    profile: async () => resolveProfile(await loadConfig(configFile), options().profile),
    print: (result: Result) =>
      print(result, {
        json: options().json === true,
        color: deps.stdout.isTTY === true && !deps.env.NO_COLOR,
        write: (chunk) => deps.stdout.write(chunk),
      }),
  };
};

export type Context = ReturnType<typeof createContext>;
