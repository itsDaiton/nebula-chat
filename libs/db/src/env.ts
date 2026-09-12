import { resolve } from 'node:path';

const packageRoot = resolve(__dirname, '..');

/**
 * Resolve `DATABASE_URL` for the migration tooling.
 *
 * It lives in the server's `.env` so the running server and the migration
 * scripts read one source of truth (AGENTS.md). CI/CD injects the variable
 * directly and ships no `.env`, so a missing file is expected, not an error.
 *
 * `drizzle.config.ts` repeats this for the `drizzle-kit` commands rather than
 * importing it: that file is bundled by drizzle-kit's own loader, and keeping
 * it dependency-free avoids coupling the dev commands to this module's
 * resolution.
 */
export const loadDatabaseUrl = (): string => {
  try {
    process.loadEnvFile(resolve(packageRoot, '../../apps/nebula-chat-server/.env'));
  } catch {
    // .env absent — CI/CD injects env vars directly
  }

  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  return databaseUrl;
};

export const migrationsFolder = resolve(packageRoot, 'migrations');

/** Must match `migrations` in drizzle.config.ts, or the journal is read from the wrong table. */
export const migrationsTable = '__drizzle_migrations';
export const migrationsSchema = 'public';
