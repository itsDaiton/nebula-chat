import { afterEach, describe, expect, it } from 'vitest';
import { createLogger } from '@nebula-chat/otel';
import type { Pool } from 'pg';
import { createDbClient } from '../client';

type LogLine = Record<string, unknown> & { level: number; msg: string };

const ERROR = 50;

let openPool: Pool | undefined;

/** A client that never connects (nothing queries it), logging into memory. */
const loggedClient = () => {
  const lines: LogLine[] = [];
  const logger = createLogger({
    serviceName: 'test',
    level: 'trace',
    destination: { write: (chunk: string) => lines.push(JSON.parse(chunk) as LogLine) },
  });
  const client = createDbClient({ connectionString: 'postgresql://localhost:1/none', logger });
  openPool = client.pool;
  return { pool: client.pool, lines };
};

// What Postgres sends an idle connection on a restart or `pg_terminate_backend`.
const terminated = () => new Error('terminating connection due to administrator command');

afterEach(async () => {
  await openPool?.end();
  openPool = undefined;
});

describe('createDbClient', () => {
  it("survives an idle client's error and logs it as one db error line", () => {
    const { pool, lines } = loggedClient();

    // With no 'error' listener, EventEmitter throws this and the process exits.
    expect(() => pool.emit('error', terminated())).not.toThrow();

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: ERROR,
      'event.name': 'db.connection.failed',
      err: { message: 'terminating connection due to administrator command' },
    });
  });

  it('logs the error without the dead client pg attaches to it', () => {
    const { pool, lines } = loggedClient();
    // pg-pool sets `err.client` before re-emitting an idle client's error.
    const err = Object.assign(terminated(), { code: '57P01', client: { host: 'db.internal' } });

    pool.emit('error', err);

    expect(lines[0]?.err).toMatchObject({ code: '57P01' });
    expect(lines[0]?.err).not.toHaveProperty('client');
  });
});
