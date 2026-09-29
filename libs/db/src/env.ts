import { resolve } from 'node:path';

const packageRoot = resolve(__dirname, '..');

/**
 * Resolve `DATABASE_URL` for the migration tooling.
 *
 * Reads the environment only. The `db:*` package scripts load the server's
 * `.env` through `dotenvx run`, so the running server and the migration
 * scripts share one source of truth; CI and Render inject the variable
 * directly. See ADR-0019.
 */
export const loadDatabaseUrl = (): string => {
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
