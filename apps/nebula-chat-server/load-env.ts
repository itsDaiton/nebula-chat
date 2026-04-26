import { resolve } from 'node:path';

/**
 * Loads env vars from this package's .env into process.env.
 * Intended for drizzle configs and other lib-level CLI tools.
 * Falls through silently when .env is absent so CI/CD can inject vars directly.
 */
export function loadServerEnv(): void {
  try {
    process.loadEnvFile(resolve(__dirname, '.env'));
  } catch {
    // .env not present — env vars must be set in the environment directly
  }
}
