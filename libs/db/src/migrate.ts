import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { loadDatabaseUrl, migrationsFolder, migrationsSchema, migrationsTable } from './env.js';

/**
 * Applies pending migrations directly, replacing `drizzle-kit migrate`, which exits 1 without printing the underlying Postgres error.
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
