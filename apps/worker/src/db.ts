import type { DbClient } from '@nebula-chat/db';
import { createDbClient } from '@nebula-chat/db';
import { env } from '@worker/env';
import { logger } from '@worker/logger';

const { db: dbInstance, pool: poolInstance } = createDbClient({
  connectionString: env.DATABASE_URL,
  logger,
});

export const db: DbClient = dbInstance;

// The Run checkpointer shares it rather than opening a second pool.
export const pool = poolInstance;

export const closeDb = (): Promise<void> => poolInstance.end();
