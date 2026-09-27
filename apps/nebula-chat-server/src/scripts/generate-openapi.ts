import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyOpenApiEnvFallbacks, missingOpenApiEnv } from '@backend/scripts/openapiEnv';

// Must run before @backend/app is imported: env.ts parses process.env on import.
applyOpenApiEnvFallbacks();

const missing = missingOpenApiEnv();
if (missing.length > 0) {
  process.stderr.write(
    `Missing required env vars for OpenAPI generation: ${missing.join(', ')}\n` +
      'Set them, or their OPENAPI_-prefixed stand-ins (e.g. OPENAPI_DATABASE_URL); placeholder values are fine.\n',
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
