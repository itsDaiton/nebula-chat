import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { loadDatabaseUrl, migrationsFolder, migrationsSchema, migrationsTable } from './env.js';

/**
 * Apply pending migrations.
 *
 * This replaces `drizzle-kit migrate`, which swallows the underlying error and
 * exits 1 with nothing on stdout — a deploy step that fails without a
 * diagnostic is not operable. Calling the migrator directly lets the real
 * Postgres error (code, failing statement, stack) reach the deploy log.
 */
const main = async (): Promise<void> => {
  const pool = new Pool({ connectionString: loadDatabaseUrl(), max: 1 });

  try {
    await migrate(drizzle(pool), {
      migrationsFolder,
      migrationsTable,
      migrationsSchema,
    });
    console.log('Migrations up to date.');
  } finally {
    await pool.end();
  }
};

main().catch((error: unknown) => {
  console.error('Migration failed.');
  console.error(error);
  process.exitCode = 1;
});
