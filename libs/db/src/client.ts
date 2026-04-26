import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

export interface DbConfig {
  connectionString: string;
  maxConnections?: number;
}

export function createDbClient(config: DbConfig) {
  const pool = new Pool({
    connectionString: config.connectionString,
    max: config.maxConnections ?? 10,
  });

  const db = drizzle(pool, { schema });
  return { db, pool };
}

export type DbClient = ReturnType<typeof createDbClient>['db'];

// Extract the transaction client type from the transaction method signature
export type DbTransaction = Parameters<Parameters<DbClient['transaction']>[0]>[0];
