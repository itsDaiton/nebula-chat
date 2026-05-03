import 'dotenv/config';
import { hasProviderKey, missingBaseKeys } from 'load-env';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

if (!hasProviderKey || missingBaseKeys.length > 0) {
  const missing = [
    ...(hasProviderKey ? [] : ['OPENAI_API_KEY or ANTHROPIC_API_KEY']),
    ...missingBaseKeys,
  ];
  process.stderr.write(
    `Missing required env vars for OpenAPI generation: ${missing.join(', ')}\n` +
      'Set the standard vars or provide OPENAPI_OPENAI_API_KEY / OPENAPI_ANTHROPIC_API_KEY, OPENAPI_DATABASE_URL, and OPENAPI_REDIS_URL.\n',
  );
  process.exit(1);
}

const main = async (): Promise<void> => {
  const { buildApp } = await import('@backend/app');
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
