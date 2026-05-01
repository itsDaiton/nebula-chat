import { defineConfig } from 'drizzle-kit';
import { resolve } from 'node:path';

try {
  process.loadEnvFile(resolve(__dirname, '../../apps/nebula-chat-server/.env'));
} catch {
  // .env absent — CI/CD injects env vars directly
}

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
