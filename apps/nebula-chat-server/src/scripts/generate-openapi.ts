import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildApp } from '@backend/app';

const main = async (): Promise<void> => {
  const app = await buildApp();
  await app.ready();

  const spec = app.swagger({ yaml: true });
  const outputPath = resolve(process.cwd(), '../../openapi/openapi.yaml');
  writeFileSync(outputPath, spec);

  process.stdout.write(`OpenAPI spec written to ${outputPath}\n`);
  await app.close();
};

main().catch((err: unknown) => {
  process.stderr.write(`Error generating OpenAPI spec: ${String(err)}\n`);
  process.exit(1);
});
