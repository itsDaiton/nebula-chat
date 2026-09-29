import { defineConfig } from 'drizzle-kit';

// The `db:*` package scripts load the server's `.env` through `dotenvx run`;
// CI and Render inject the variable directly. See ADR-0019. The check repeats
// `loadDatabaseUrl()` rather than importing it: drizzle-kit bundles this file
// with its own loader, so it stays dependency-free.
const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  migrations: {
    table: '__drizzle_migrations',
    schema: 'public',
  },
});
