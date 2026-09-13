import { createLogger } from '@nebula-chat/otel';
import { resolve } from 'node:path';

// Deliberately not configured from @backend/env: this module exists to populate
// process.env before env.ts parses it, so it cannot import the parsed env.
// createLogger falls back to process.env.LOG_LEVEL.
const logger = createLogger();

/**
 * Loads env vars from this package's .env into process.env.
 * Intended for drizzle configs and other lib-level CLI tools.
 * Falls through silently when .env is absent so CI/CD can inject vars directly.
 */
export const loadServerEnv = (): void => {
  try {
    process.loadEnvFile(resolve(__dirname, '.env'));
  } catch {
    logger.warn('No .env file found for nebula-chat-server, falling back to process.env');
  }
};

export const hasProviderKey =
  process.env.OPENAI_API_KEY !== undefined || process.env.ANTHROPIC_API_KEY !== undefined;

export const missingBaseKeys = (['DATABASE_URL', 'REDIS_URL'] as const).filter(
  (key) => !process.env[key],
);
