import { resolve } from 'node:path';

const packageRoot = resolve(__dirname, '..');

/**
 * Resolves `DATABASE_URL` for the migration tooling from the environment only; the `db:*` scripts load the server's `.env` through `dotenvx` (ADR-0019).
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
