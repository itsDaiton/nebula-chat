import { defineConfig } from 'drizzle-kit';
import { resolve } from 'node:path';

try {
  process.loadEnvFile(resolve(__dirname, '../../apps/nebula-chat-server/.env'));
} catch {
  // .env absent — CI/CD injects env vars directly
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL']!,
  },
  migrations: {
    table: '__drizzle_migrations',
    schema: 'public',
  },
});
