import { defineConfig } from 'drizzle-kit';
import { resolve } from 'node:path';

// Load DATABASE_URL from the server's .env — single source of truth
try {
  process.loadEnvFile(resolve(process.cwd(), '../../apps/nebula-chat-server/.env'));
} catch {
  // .env not present (e.g. CI/CD) — DATABASE_URL must be set in the environment directly
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL']!,
  },
});
