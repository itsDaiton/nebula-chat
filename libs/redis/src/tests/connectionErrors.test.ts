import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '@nebula-chat/otel';
import { logConnectionErrors } from '../connectionErrors';

type LogLine = Record<string, unknown> & { level: number; msg: string };

const ERROR = 50;
const INFO = 30;
const DEBUG = 20;

/** A connection whose events a test emits by hand, logging into memory at every level. */
const watchedConnection = () => {
  const lines: LogLine[] = [];
  const logger = createLogger({
    serviceName: 'test',
    level: 'trace',
    destination: { write: (chunk: string) => lines.push(JSON.parse(chunk) as LogLine) },
  });
  const connection = new EventEmitter();
  logConnectionErrors(connection, logger);
  return { connection, lines };
};

const refused = () => new Error('connect ECONNREFUSED 127.0.0.1:6380');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('logConnectionErrors', () => {
  it('logs a connection error as a redis error line carrying the error', () => {
    const { connection, lines } = watchedConnection();

    connection.emit('error', refused());

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: ERROR,
      'event.name': 'redis.connection.failed',
      'nebula.component': 'redis',
      err: { message: 'connect ECONNREFUSED 127.0.0.1:6380' },
    });
  });

  it('logs the repeated reconnect failures of one outage at debug', () => {
    const { connection, lines } = watchedConnection();

    connection.emit('error', refused());
    connection.emit('error', refused());
    connection.emit('error', refused());

    expect(lines.map((line) => line.level)).toEqual([ERROR, DEBUG, DEBUG]);
    expect(lines.every((line) => line['event.name'] === 'redis.connection.failed')).toBe(true);
  });

  it('logs the restore that ends an outage, with how long it lasted', () => {
    const { connection, lines } = watchedConnection();

    connection.emit('error', refused());
    vi.advanceTimersByTime(4_000);
    connection.emit('error', refused());
    vi.advanceTimersByTime(1_500);
    connection.emit('ready');

    expect(lines.at(-1)).toMatchObject({
      level: INFO,
      'event.name': 'redis.connection.restored',
      'nebula.component': 'redis',
      'nebula.duration_ms': 5_500,
    });
  });

  it('logs nothing when the connection becomes ready without having failed', () => {
    const { connection, lines } = watchedConnection();

    connection.emit('ready');

    expect(lines).toEqual([]);
  });

  it('treats the first error after a restore as a new outage', () => {
    const { connection, lines } = watchedConnection();

    connection.emit('error', refused());
    connection.emit('ready');
    connection.emit('error', refused());

    expect(lines.map((line) => [line.level, line['event.name']])).toEqual([
      [ERROR, 'redis.connection.failed'],
      [INFO, 'redis.connection.restored'],
      [ERROR, 'redis.connection.failed'],
    ]);
  });
});
