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
};

/** Drives `run(argv, deps)` in-process: a temp home and XDG dir, captured streams, MSW for HTTP. */
export const createHarness = async ({ env = {}, isTTY = false }: HarnessOptions = {}) => {
  const home = await mkdtemp(join(tmpdir(), 'nebula-cli-'));
  tempDirs.push(home);
  const xdgConfigHome = join(home, 'xdg');
  const configFile = join(xdgConfigHome, 'nebula-chat', 'config.json');
  const stdout = captureStream(isTTY);
  const stderr = captureStream(isTTY);
  const deps: Deps = {
    env: { XDG_CONFIG_HOME: xdgConfigHome, ...env },
    stdout: stdout.stream,
    stderr: stderr.stream,
    // Late-bound, so the call goes through the fetch MSW patched.
    fetch: (input, init) => globalThis.fetch(input, init),
    now: () => NOW,
    homeDir: home,
  };

  return {
    home,
    configFile,
    run: (...argv: string[]) => run(argv, deps),
    stdout: stdout.text,
    stderr: stderr.text,
    readConfig: async (path = configFile): Promise<unknown> =>
      JSON.parse(await readFile(path, 'utf8')),
    writeConfig: async (config: unknown) => {
      await mkdir(dirname(configFile), { recursive: true });
      await writeFile(configFile, JSON.stringify(config));
    },
  };
};
