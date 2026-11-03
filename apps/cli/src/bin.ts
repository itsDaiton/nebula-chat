#!/usr/bin/env node
import { homedir } from 'node:os';
import { createInterface } from 'node:readline/promises';
import { run } from '@cli/run';

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
});
