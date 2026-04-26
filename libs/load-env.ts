import { resolve } from 'node:path';

/**
 * Loads env vars from apps/nebula-chat-server/.env into process.env.
 * Intended for drizzle configs and other lib-level CLI tools that run
 * via `pnpm --filter <pkg>` (which sets cwd to the package directory).
 * Falls through silently when .env is absent so CI/CD can inject vars directly.
 */
export function loadServerEnv(): void {
  try {
    process.loadEnvFile(resolve(process.cwd(), '../../apps/nebula-chat-server/.env'));
  } catch {
    // .env not present — env vars must be set in the environment directly
  }
}
