import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Catalog = {
  version: string;
  hash: string;
  defaultModels: Record<string, string>;
  models: unknown[];
};

const CATALOG_PATH = resolve(process.cwd(), 'libs/contracts/src/models/catalog.json');

// The same content the contracts test hashes: formatting and the version/hash fields do not count.
const hashOf = (catalog: Catalog): string =>
  createHash('sha256')
    .update(JSON.stringify({ defaultModels: catalog.defaultModels, models: catalog.models }))
    .digest('hex');

const main = (): void => {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8')) as Catalog;
  const hash = hashOf(catalog);

  if (hash === catalog.hash) {
    process.stdout.write(`Model catalog already stamped: ${catalog.version}\n`);
    return;
  }

  const version = `${new Date().toISOString().slice(0, 10)}-${randomUUID()}`;
  const stamped: Catalog = { ...catalog, version, hash };
  writeFileSync(CATALOG_PATH, `${JSON.stringify(stamped, null, 2)}\n`);
  process.stdout.write(`Model catalog stamped: ${version}\n`);
};

main();
