import { afterEach, describe, expect, it } from 'vitest';
import { createLogger } from '../logger';
import type { CreateLoggerOptions } from '../logger';
import { captureDestination } from './capture';

const originalLogLevel = process.env.LOG_LEVEL;

/** A logger writing to memory at `trace`, so every line is observable. */
const capture = (options: Partial<CreateLoggerOptions> = {}) => {
  const { lines, destination } = captureDestination();
  const logger = createLogger({
    serviceName: 'test-service',
    level: 'trace',
    destination,
    ...options,
  });
  return { logger, lines };
};

describe('createLogger', () => {
  afterEach(() => {
    if (originalLogLevel === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = originalLogLevel;
  });

  describe('level', () => {
    it('uses an explicitly supplied level', () => {
      expect(createLogger({ serviceName: 's', level: 'warn' }).level).toBe('warn');
    });

    it('falls back to LOG_LEVEL when no level is supplied', () => {
      process.env.LOG_LEVEL = 'debug';

      expect(createLogger({ serviceName: 's' }).level).toBe('debug');
    });

    it('prefers the explicit level over LOG_LEVEL', () => {
      process.env.LOG_LEVEL = 'debug';

      expect(createLogger({ serviceName: 's', level: 'error' }).level).toBe('error');
    });

    it("defaults to 'info' when neither is set", () => {
      delete process.env.LOG_LEVEL;

      expect(createLogger({ serviceName: 's' }).level).toBe('info');
    });
  });

  it('requires a service name', () => {
    // @ts-expect-error -- every line names the service that wrote it
    expect(() => createLogger({ level: 'silent' })).not.toThrow();
  });

  it('writes parseable JSON lines to a supplied destination', () => {
    const { logger, lines } = capture();

    logger.info('hello');

    expect(lines).toHaveLength(1);
    expect(lines[0]?.msg).toBe('hello');
  });

  it('stamps the service fields and pid on every line, and no hostname', () => {
    const { logger, lines } = capture({ serviceVersion: '1.2.3', environment: 'production' });

    logger.info('one');
    logger.child({ 'nebula.component': 'redis' }).warn('two');

    for (const line of lines) {
      expect(line).toMatchObject({
        'service.name': 'test-service',
        'service.version': '1.2.3',
        'deployment.environment.name': 'production',
        pid: process.pid,
      });
      expect(line).not.toHaveProperty('hostname');
    }
  });

  it('omits service fields that were not supplied', () => {
    const { logger, lines } = capture();

    logger.info('bare');

    expect(lines[0]).not.toHaveProperty('service.version');
    expect(lines[0]).not.toHaveProperty('deployment.environment.name');
  });

  describe('err serialization', () => {
    it('serializes an Error with its type, message, stack and cause', () => {
      const { logger, lines } = capture();
      const cause = new Error('driver said no');

      logger.error({ err: new TypeError('outer', { cause }) }, 'failed');

      expect(lines[0]?.err).toMatchObject({
        type: 'TypeError',
        message: 'outer',
        stack: expect.stringContaining('TypeError: outer'),
        cause: { type: 'Error', message: 'driver said no', stack: expect.any(String) },
      });
    });

    it('serializes an Error passed as the first argument under err', () => {
      const { logger, lines } = capture();

      logger.error(new Error('bare'));

      expect(lines[0]?.err).toMatchObject({ type: 'Error', message: 'bare' });
    });

    it('serializes a thrown non-Error as an object rather than a bare value', () => {
      const { logger, lines } = capture();

      logger.error({ err: 'a bare string' }, 'failed');

      expect(lines[0]?.err).toEqual({ type: 'string', message: 'a bare string' });
    });
  });

  describe('redaction', () => {
    it.each([
      [
        'a nested request cookie',
        { req: { headers: { cookie: 'SECRET' } } },
        ['req', 'headers', 'cookie'],
      ],
      [
        'a nested Authorization header',
        { req: { headers: { authorization: 'SECRET' } } },
        ['req', 'headers', 'authorization'],
      ],
      [
        'a nested set-cookie header',
        { res: { headers: { 'set-cookie': 'SECRET' } } },
        ['res', 'headers', 'set-cookie'],
      ],
      [
        'a flat dotted cookie header',
        { 'http.request.header.cookie': 'SECRET' },
        ['http.request.header.cookie'],
      ],
      [
        'a flat dotted Authorization header',
        { 'http.request.header.authorization': 'SECRET' },
        ['http.request.header.authorization'],
      ],
      ['a nested API key', { config: { apiKey: 'SECRET' } }, ['config', 'apiKey']],
      ['a top-level API key', { apiKey: 'SECRET' }, ['apiKey']],
      ['nested Message content', { message: { content: 'SECRET' } }, ['message', 'content']],
      ['a prompt', { prompt: 'SECRET' }, ['prompt']],
      ['a flat dotted prompt', { 'gen_ai.prompt': 'SECRET' }, ['gen_ai.prompt']],
      ['a flat dotted email', { 'user.email': 'SECRET' }, ['user.email']],
      ['a nested email', { user: { email: 'SECRET' } }, ['user', 'email']],
      ['an email inside forwarded args', { args: [{ email: 'SECRET' }] }, ['args', '0', 'email']],
    ])('censors %s', (_label, fields, path) => {
      const { logger, lines } = capture();

      logger.info(fields, 'redaction');

      const value = path.reduce<unknown>(
        (node, key) => (node as Record<string, unknown> | undefined)?.[key],
        lines[0],
      );
      expect(value).toBe('[Redacted]');
      expect(JSON.stringify(lines[0])).not.toContain('SECRET');
    });

    it('leaves opaque ids untouched', () => {
      const { logger, lines } = capture();

      logger.info({ 'user.id': 'u-1', 'nebula.message.id': 'm-1' }, 'ids');

      expect(lines[0]).toMatchObject({ 'user.id': 'u-1', 'nebula.message.id': 'm-1' });
    });
  });

  it('supports child loggers with bound context', () => {
    const { logger, lines } = capture();

    logger.child({ 'user.id': 'u-1' }).info('bound');

    expect(lines[0]?.['user.id']).toBe('u-1');
  });

  it('exposes the standard Pino level methods', () => {
    const logger = createLogger({ serviceName: 's', level: 'silent' });

    for (const method of ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const) {
      expect(logger[method]).toBeTypeOf('function');
    }
  });

  it('builds a pretty-transport logger without throwing', () => {
    expect(() => createLogger({ serviceName: 's', pretty: true, level: 'silent' })).not.toThrow();
  });
});
