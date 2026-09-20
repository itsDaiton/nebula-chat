import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createAuth } from '@nebula-chat/auth';

/**
 * Emits better-auth's OpenAPI 3.1 schema for the `/api/auth/*` surface to
 * `openapi/auth-openapi.json`, so the auth endpoints can be imported into an API
 * client (Bruno/Postman) without a running server. See `docs/auth.md`.
 *
 * Unlike `generate-openapi.ts`, this needs no database, Redis, or provider key:
 * `generateOpenAPISchema()` describes endpoint shapes, not runtime data, so a
 * throwaway instance built from inert stubs produces the same document as the live
 * server. The injected `secret`/`baseURL` do not affect the generated schema.
 */

const noop = async (): Promise<undefined> => undefined;

// Inert dependencies: schema generation never reads the DB, Redis, or logger.
const auth = createAuth({
  db: {} as never,
  authStore: { get: noop, getAndDelete: noop, increment: noop, set: noop, delete: noop } as never,
  logger: { info: noop, error: noop, warn: noop, debug: noop } as never,
  secret: 'openapi-generation-only',
  baseURL: 'http://localhost:3000',
});

const main = async (): Promise<void> => {
  // `generateOpenAPISchema` is added to `auth.api` by the openAPI plugin. The
  // exported `AuthInstance` is the portable base `Auth` type (see the lib), which
  // does not carry the plugin's method, so reach it through a narrow cast.
  const schema = await (
    auth.api as unknown as { generateOpenAPISchema: () => Promise<unknown> }
  ).generateOpenAPISchema();

  const outputPath = resolve(process.cwd(), '../../openapi/auth-openapi.json');
  writeFileSync(outputPath, `${JSON.stringify(schema, null, 2)}\n`);
  process.stdout.write(`Auth OpenAPI schema written to ${outputPath}\n`);
};

main().catch((err: unknown) => {
  process.stderr.write(`Error generating auth OpenAPI schema: ${String(err)}\n`);
  process.exit(1);
});
