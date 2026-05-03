import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

process.env.LLM_API_KEY ??= process.env.OPENAPI_LLM_API_KEY;
process.env.DATABASE_URL ??= process.env.OPENAPI_DATABASE_URL;
process.env.REDIS_URL ??= process.env.OPENAPI_REDIS_URL;

const requiredKeys = ['LLM_API_KEY', 'DATABASE_URL', 'REDIS_URL'] as const;
const missingKeys = requiredKeys.filter((key) => !process.env[key]);

if (missingKeys.length > 0) {
  process.stderr.write(
    `Missing required env vars for OpenAPI generation: ${missingKeys.join(', ')}\n` +
      'Set the standard vars or provide OPENAPI_LLM_API_KEY, OPENAPI_DATABASE_URL, and OPENAPI_REDIS_URL.\n',
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
