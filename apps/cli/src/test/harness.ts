import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach } from 'vitest';
import { run, type Deps } from '@cli/run';

export const SERVER_URL = 'http://nebula.test';
const NOW = new Date('2026-10-19T12:00:00.000Z');

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const captureStream = (isTTY: boolean) => {
  let text = '';
  return {
    stream: {
      isTTY,
      write: (chunk: string) => {
        text += chunk;
        return true;
      },
    },
    text: () => text,
  };
};

type HarnessOptions = {
  env?: Record<string, string | undefined>;
  isTTY?: boolean;
  /** What the operator types at a confirmation prompt; the prompts asked are recorded in `asked`. */
  answer?: boolean;
  /** `false` is a machine without a keychain (CI, a container): every call to it throws. */
  keychain?: boolean;
  /** `false` is a machine with no browser to open. */
  browser?: boolean;
};

/** Drives `run(argv, deps)` in-process: a temp home and XDG dir, captured streams, MSW for HTTP. */
export const createHarness = async ({
  env = {},
  isTTY = false,
  answer = false,
  keychain = true,
  browser = true,
}: HarnessOptions = {}) => {
  const home = await mkdtemp(join(tmpdir(), 'nebula-cli-'));
  tempDirs.push(home);
  const xdgConfigHome = join(home, 'xdg');
  const configFile = join(xdgConfigHome, 'nebula-chat', 'config.json');
  const stdout = captureStream(isTTY);
  const stderr = captureStream(isTTY);
  const asked: string[] = [];
  const secrets = new Map<string, string>();
  const opened: string[] = [];
  const slept: number[] = [];
  // The fake clock: only `sleep` moves it.
  let now = NOW.getTime();
  const useKeychain = <T>(use: () => T): Promise<T> =>
    keychain ? Promise.resolve(use()) : Promise.reject(new Error('no keychain on this machine'));
  const deps: Deps = {
    env: { XDG_CONFIG_HOME: xdgConfigHome, ...env },
    stdout: stdout.stream,
    stderr: stderr.stream,
    stdin: { isTTY },
    confirm: async (question) => {
      asked.push(question);
      return answer;
    },
    // Late-bound, so the call goes through the fetch MSW patched.
    fetch: (input, init) => globalThis.fetch(input, init),
    now: () => new Date(now),
    homeDir: home,
    keychain: {
      get: (account) => useKeychain(() => secrets.get(account) ?? null),
      set: (account, secret) => useKeychain(() => void secrets.set(account, secret)),
      delete: (account) => useKeychain(() => void secrets.delete(account)),
    },
    openBrowser: async (url) => {
      if (!browser) throw new Error('no browser on this machine');
      opened.push(url);
    },
    sleep: async (ms) => {
      slept.push(ms);
      now += ms;
    },
  };

  return {
    home,
    configFile,
    credentialsFile: join(xdgConfigHome, 'nebula-chat', 'credentials.json'),
    secrets,
    opened,
    slept,
    run: (...argv: string[]) => run(argv, deps),
    stdout: stdout.text,
    stderr: stderr.text,
    asked,
    readConfig: async (path = configFile): Promise<unknown> =>
      JSON.parse(await readFile(path, 'utf8')),
    writeConfig: async (config: unknown) => {
      await mkdir(dirname(configFile), { recursive: true });
      await writeFile(configFile, JSON.stringify(config));
    },
  };
};
