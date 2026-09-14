import { afterEach, describe, expect, it } from 'vitest';
import { createLogger } from './logger';

const originalLogLevel = process.env.LOG_LEVEL;

describe('createLogger', () => {
  afterEach(() => {
    if (originalLogLevel === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = originalLogLevel;
  });

  it('uses an explicitly supplied level', () => {
    expect(createLogger({ level: 'warn' }).level).toBe('warn');
  });

  it('falls back to LOG_LEVEL when no level is supplied', () => {
    process.env.LOG_LEVEL = 'debug';

    expect(createLogger().level).toBe('debug');
  });

  it('prefers the explicit level over LOG_LEVEL', () => {
    process.env.LOG_LEVEL = 'debug';

    expect(createLogger({ level: 'error' }).level).toBe('error');
  });

  it("defaults to 'info' when neither is set", () => {
    delete process.env.LOG_LEVEL;

    expect(createLogger().level).toBe('info');
  });

  it('exposes the standard Pino level methods', () => {
    const logger = createLogger({ level: 'silent' });

    for (const method of ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const) {
      expect(logger[method]).toBeTypeOf('function');
    }
  });

  it('supports child loggers with bound context', () => {
    const child = createLogger({ level: 'silent' }).child({ component: 'test' });

    expect(child.level).toBe('silent');
    expect(child.info).toBeTypeOf('function');
  });

  it('builds a pretty-transport logger without throwing', () => {
    expect(() => createLogger({ pretty: true, level: 'silent' })).not.toThrow();
  });
});
