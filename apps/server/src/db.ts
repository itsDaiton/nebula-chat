import type { DbClient } from '@nebula-chat/db';
import { createDbClient } from '@nebula-chat/db';
import { env } from '@server/env';
import { logger } from '@server/logger';

const { db: dbInstance, pool } = createDbClient({ connectionString: env.DATABASE_URL, logger });

export const db: DbClient = dbInstance;

export const closeDb = (): Promise<void> => pool.end();
