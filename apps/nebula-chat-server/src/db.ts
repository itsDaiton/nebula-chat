import type { DbClient } from '@nebula-chat/db';
import { createDbClient } from '@nebula-chat/db';
import { env } from '@backend/env';

const { db: dbInstance, pool } = createDbClient({ connectionString: env.DATABASE_URL });

export const db: DbClient = dbInstance;

export const closeDb = (): Promise<void> => pool.end();
