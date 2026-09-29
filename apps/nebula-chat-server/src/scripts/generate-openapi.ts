import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// env.ts parses process.env on import, so these must be set before @backend/app loads.
// No connection is opened (pg and Redis are lazy), so placeholders suffice; a real var wins.
process.env['DATABASE_URL'] ??= 'postgresql://openapi:openapi@localhost:5432/openapi';
process.env['REDIS_URL'] ??= 'redis://localhost:6379';
process.env['BETTER_AUTH_SECRET'] ??= 'openapi-placeholder-secret-never-used-for-signing';
process.env['BETTER_AUTH_URL'] ??= 'http://localhost:3000';
if (!process.env['OPENAI_API_KEY'] && !process.env['ANTHROPIC_API_KEY']) {
  process.env['OPENAI_API_KEY'] = 'openapi-placeholder-key';
}

const main = async (): Promise<void> => {
  const { buildApp } = await import('@backend/app.js');
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
