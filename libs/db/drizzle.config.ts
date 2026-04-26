import { defineConfig } from 'drizzle-kit';
import { loadServerEnv } from '../../apps/nebula-chat-server/load-env';

loadServerEnv();

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
