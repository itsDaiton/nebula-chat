import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { agentHash } from '../apps/worker/src/runs/agentHash';

type Catalog = {
  version: string;
  hash: string;
  defaultModels: Record<string, string>;
  models: unknown[];
};

type StampedFile = { version: string; hash: string; prompt: string };

const CATALOG_PATH = resolve(process.cwd(), 'libs/contracts/src/models/catalog.json');
const AGENT_DIR = resolve(process.cwd(), 'apps/worker/src/agents');
const PROMPT_DIR = resolve(process.cwd(), 'apps/worker/src/resources/prompts');
const AGENT_FILES = [
  'language',
  'session',
  'orchestrator',
  'output',
  'analyst',
  'critic',
  'researcher',
];

// The same content the contracts test hashes: formatting and the version/hash fields do not count.
const hashOf = (catalog: Catalog): string =>
  createHash('sha256')
    .update(JSON.stringify({ defaultModels: catalog.defaultModels, models: catalog.models }))
    .digest('hex');

const newVersion = (): string => `${new Date().toISOString().slice(0, 10)}-${randomUUID()}`;

const stamp = <T extends { version: string; hash: string }>(
  label: string,
  path: string,
  file: T,
  hash: string,
): void => {
  if (hash === file.hash) {
    process.stdout.write(`${label} already stamped: ${file.version}\n`);
    return;
  }

  const stamped: T = { ...file, version: newVersion(), hash };
  writeFileSync(path, `${JSON.stringify(stamped, null, 2)}\n`);
  process.stdout.write(`${label} stamped: ${stamped.version}\n`);
};

const main = (): void => {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8')) as Catalog;
  stamp('Model catalog', CATALOG_PATH, catalog, hashOf(catalog));

  // The same content the worker test hashes: the definition and the prompt's text.
  for (const name of AGENT_FILES) {
    const path = resolve(AGENT_DIR, `${name}.json`);
    const file = JSON.parse(readFileSync(path, 'utf8')) as StampedFile;
    const prompt = readFileSync(resolve(PROMPT_DIR, `${file.prompt}.md`), 'utf8');
    stamp(`Agent ${name}`, path, file, agentHash(file, prompt));
  }
};

main();
