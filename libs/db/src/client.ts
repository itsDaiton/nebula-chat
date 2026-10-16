import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { logEvent } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';
import * as schema from './schema.js';

export type DbConfig = {
  connectionString: string;
  maxConnections?: number;
  /**
   * Injected `@nebula-chat/otel` logger. The lib logs exclusively through this,
   * never through `console` or a consumer's own logger.
   */
  logger: Logger;
};

export const createDbClient = (config: DbConfig) => {
  const pool = new Pool({
    connectionString: config.connectionString,
    max: config.maxConnections ?? 10,
  });

  // pg re-emits an idle client's error (restart, failover, `pg_terminate_backend`) on the
  // pool, and an unhandled 'error' exits the process. The pool has already dropped that client.
  pool.on('error', (err) => {
    // pg-pool tacks the dead Client onto the error; serialized, that is kilobytes of socket state.
    delete (err as Error & { client?: unknown }).client;
    logEvent(
      config.logger,
      'error',
      'db.connection.failed',
      { err },
      'Idle Postgres connection failed; the pool replaces it on the next query',
    );
  });

  const db = drizzle(pool, { schema });
  return { db, pool };
};

export type DbClient = ReturnType<typeof createDbClient>['db'];

// Extract the transaction client type from the transaction method signature
export type DbTransaction = Parameters<Parameters<DbClient['transaction']>[0]>[0];
