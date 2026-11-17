import { configFilePath, loadConfig, resolveProfile } from '@cli/config/config';
import { createCredentialStore, type Keychain } from '@cli/credentials/credentials';
import { print, type Result } from '@cli/output/print';

type Stream = { write: (chunk: string) => unknown; isTTY?: boolean };

/** Everything the CLI touches outside its own process state. `bin.ts` wires the real ones. */
export type Deps = {
  env: Record<string, string | undefined>;
  stdout: Stream;
  stderr: Stream;
  stdin: { isTTY?: boolean };
  confirm: (question: string) => Promise<boolean>;
  fetch: typeof globalThis.fetch;
  now: () => Date;
  homeDir: string;
  /** The OS keychain; every call rejects on a machine without one. */
  keychain: Keychain;
  /** Rejects when there is no browser to open. */
  openBrowser: (url: string) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
};

export type GlobalOptions = { json?: boolean; profile?: string };

/** What every command gets: the deps, the config file, the selected profile and the printer. */
export const createContext = (deps: Deps, options: () => GlobalOptions) => {
  const configFile = configFilePath(deps.env, deps.homeDir);
  return {
    deps,
    configFile,
    credentials: createCredentialStore(deps.keychain, configFile),
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
