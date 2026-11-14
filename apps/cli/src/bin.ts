#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { AsyncEntry } from '@napi-rs/keyring';
import { run } from '@cli/run';

const KEYCHAIN_SERVICE = 'nebula-chat';

const BROWSER_COMMAND: Partial<Record<NodeJS.Platform, [command: string, ...args: string[]]>> = {
  darwin: ['open'],
  win32: ['cmd', '/c', 'start', '""'],
};

process.exitCode = await run(process.argv.slice(2), {
  env: process.env,
  stdout: process.stdout,
  stderr: process.stderr,
  stdin: process.stdin,
  confirm: async (question) => {
    const rl = createInterface({ input: process.stdin, output: process.stderr });
    try {
      return /^y(es)?$/i.test((await rl.question(`${question} [y/N] `)).trim());
    } finally {
      rl.close();
    }
  },
  fetch: globalThis.fetch,
  now: () => new Date(),
  homeDir: homedir(),
  keychain: {
    get: (account) => new AsyncEntry(KEYCHAIN_SERVICE, account).getPassword(),
    set: (account, secret) => new AsyncEntry(KEYCHAIN_SERVICE, account).setPassword(secret),
    delete: async (account) => {
      await new AsyncEntry(KEYCHAIN_SERVICE, account).deletePassword();
    },
  },
  openBrowser: (url) =>
    new Promise((resolve, reject) => {
      const [command, ...args] = BROWSER_COMMAND[process.platform] ?? ['xdg-open'];
      const child = spawn(command, [...args, url], { stdio: 'ignore', detached: true });
      child.once('error', reject);
      child.once('spawn', () => {
        child.unref();
        resolve();
      });
    }),
  sleep: async (ms) => {
    await sleep(ms);
  },
});
