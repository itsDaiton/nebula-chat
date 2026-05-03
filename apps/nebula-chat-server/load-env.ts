import { logger } from '@backend/logger';
import { resolve } from 'node:path';

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
