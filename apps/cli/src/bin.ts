#!/usr/bin/env node
import { homedir } from 'node:os';
import { run } from '@cli/run';

process.exitCode = await run(process.argv.slice(2), {
  env: process.env,
  stdout: process.stdout,
  stderr: process.stderr,
  fetch: globalThis.fetch,
  now: () => new Date(),
  homeDir: homedir(),
});
