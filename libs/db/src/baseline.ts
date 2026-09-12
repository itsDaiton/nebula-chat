import { readMigrationFiles } from 'drizzle-orm/migrator';
import { Pool } from 'pg';
import { loadDatabaseUrl, migrationsFolder, migrationsSchema, migrationsTable } from './env.js';

/**
 * Mark the existing migration files as already applied, without running them.
 *
 * Needed when a database predates the migration journal — here, the schema was
 * created during the Prisma era (ADR 0004) and `drizzle-kit migrate` never ran
 * against it. The journal is empty, so the migrator treats `0000` as pending
 * and re-runs `CREATE TABLE`, which fails with 42P07 against the live schema.
 *
 * Reports by default; pass `--apply` to write. Take a database snapshot first.
 */

const listTables = async (pool: Pool): Promise<string[]> => {
  const { rows } = await pool.query<{ tablename: string }>(
    'SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename',
    [migrationsSchema],
  );
  return rows.map((row) => row.tablename);
};

const countJournalRows = async (pool: Pool, journalExists: boolean): Promise<number> => {
  if (!journalExists) {
    return 0;
  }
  const { rows } = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM "${migrationsSchema}"."${migrationsTable}"`,
  );
  return Number(rows[0]?.count ?? '0');
};

const main = async (): Promise<void> => {
  const apply = process.argv.includes('--apply');
  const pool = new Pool({ connectionString: loadDatabaseUrl(), max: 1 });

  try {
    const tables = await listTables(pool);
    const journalExists = tables.includes(migrationsTable);
    const journalRows = await countJournalRows(pool, journalExists);
    const schemaTables = tables.filter((table) => table !== migrationsTable);
    const migrations = readMigrationFiles({ migrationsFolder, migrationsTable, migrationsSchema });

    console.log(`Schema "${migrationsSchema}" tables: ${schemaTables.join(', ') || '(none)'}`);
    console.log(
      `Journal "${migrationsTable}": ${journalExists ? `${journalRows} row(s)` : 'absent'}`,
    );
    console.log(`Migration files on disk: ${migrations.length}`);

    if (journalRows > 0) {
      console.log('\nJournal is already populated — nothing to baseline. Run db:migrate instead.');
      return;
    }
    if (schemaTables.length === 0) {
      console.log('\nSchema is empty — no baseline needed. Run db:migrate to create it.');
      return;
    }

    console.log(`\nWould mark ${migrations.length} migration(s) as applied:`);
    for (const migration of migrations) {
      console.log(`  ${migration.hash} (created_at ${migration.folderMillis})`);
    }

    if (!apply) {
      console.log('\nDry run. Re-run with --apply to write these rows.');
      return;
    }

    // Same DDL the migrator itself uses, so a later db:migrate reads this table.
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${migrationsSchema}"`);
    await pool.query(
      `CREATE TABLE IF NOT EXISTS "${migrationsSchema}"."${migrationsTable}" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )`,
    );
    for (const migration of migrations) {
      await pool.query(
        `INSERT INTO "${migrationsSchema}"."${migrationsTable}" ("hash", "created_at") VALUES ($1, $2)`,
        [migration.hash, migration.folderMillis],
      );
    }
    console.log(`\nBaselined ${migrations.length} migration(s). db:migrate is now a no-op.`);
  } finally {
    await pool.end();
  }
};

main().catch((error: unknown) => {
  console.error('Baseline failed.');
  console.error(error);
  process.exitCode = 1;
});
