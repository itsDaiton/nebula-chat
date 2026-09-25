import { describe, it, expect } from 'vitest';
import { createLogger } from '@nebula-chat/otel';
import { toBetterAuthLogHandler } from '../logger';

type LogLine = Record<string, unknown> & { level: number; msg: string };

/** A real `@nebula-chat/otel` logger writing parsed lines to memory. */
const makeLogger = (level = 'trace') => {
  const lines: LogLine[] = [];
  const logger = createLogger({
    serviceName: 'test',
    level,
    destination: { write: (chunk: string) => lines.push(JSON.parse(chunk) as LogLine) },
  });
  return { logger, lines };
};

describe('toBetterAuthLogHandler', () => {
  it('stamps every line as auth.library.log from nebula.component auth', () => {
    const { logger, lines } = makeLogger();
    const log = toBetterAuthLogHandler(logger);

    log('info', 'session created');
    log('error', 'sign-in failed');

    for (const line of lines) {
      expect(line['event.name']).toBe('auth.library.log');
      expect(line['nebula.component']).toBe('auth');
    }
  });

  it("keeps better-auth's own text as the message", () => {
    const { logger, lines } = makeLogger();

    toBetterAuthLogHandler(logger)('warn', 'Rate limit exceeded');

    expect(lines[0]?.msg).toBe('Rate limit exceeded');
  });

  it('routes each better-auth level to the matching Pino level', () => {
    const { logger, lines } = makeLogger();
    const log = toBetterAuthLogHandler(logger);

    log('debug', 'd');
    log('info', 'i');
    log('warn', 'w');
    log('error', 'e');

    // Pino numeric levels: debug 20, info 30, warn 40, error 50.
    expect(lines.map((l) => [l.level, l.msg])).toEqual([
      [20, 'd'],
      [30, 'i'],
      [40, 'w'],
      [50, 'e'],
    ]);
  });

  it('gathers extra args under a single args attribute rather than interpolating them', () => {
    const { logger, lines } = makeLogger();

    toBetterAuthLogHandler(logger)('error', 'failed', { code: 500 }, 'extra');

    expect(lines[0]?.msg).toBe('failed');
    expect(lines[0]?.args).toEqual([{ code: 500 }, 'extra']);
  });

  it('omits args when better-auth passes none', () => {
    const { logger, lines } = makeLogger();

    toBetterAuthLogHandler(logger)('info', 'bare');

    expect(lines[0]).not.toHaveProperty('args');
  });

  it('censors an email better-auth passes along in its args', () => {
    const { logger, lines } = makeLogger();

    toBetterAuthLogHandler(logger)('error', 'user lookup failed', { email: 'ada@example.com' });

    expect(JSON.stringify(lines)).not.toContain('ada@example.com');
  });

  it('respects the logger level', () => {
    const { logger, lines } = makeLogger('warn');

    toBetterAuthLogHandler(logger)('info', 'not emitted');

    expect(lines).toEqual([]);
  });
});
