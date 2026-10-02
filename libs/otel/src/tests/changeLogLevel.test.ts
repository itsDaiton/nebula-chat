import pino from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { changeLogLevel } from '../changeLogLevel';
import { componentLogger } from '../componentLogger';
import { captureDestination, captureLogger } from './capture';

/** The `msg` of every line except the ones recording a level change. */
const messages = (lines: { msg?: string; 'event.name'?: unknown }[]) =>
  lines.filter((l) => !String(l['event.name']).startsWith('log.level.')).map((l) => l.msg);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('changeLogLevel', () => {
  it('changes the root level of a running logger and the children it already has', () => {
    const { logger, lines } = captureLogger({ level: 'info' });
    const requestLogger = logger.child({ 'http.request.id': 'req-1' });

    changeLogLevel(logger, { level: 'debug', ttlSeconds: 60, operator: 'ada' });
    logger.debug('root detail');
    requestLogger.debug('request detail');

    expect(messages(lines)).toEqual(['root detail', 'request detail']);
  });

  it("changes one component's level, reaching the loggers it already has, and nothing else", () => {
    const { logger, lines } = captureLogger({ level: 'info' });
    const redis = componentLogger(logger, 'redis');
    const http = componentLogger(logger.child({ 'http.request.id': 'req-1' }), 'http');

    changeLogLevel(logger, { component: 'redis', level: 'debug', ttlSeconds: 60, operator: 'ada' });
    redis.debug('cache detail');
    componentLogger(logger, 'redis').debug('later cache detail');
    http.debug('not emitted');
    logger.debug('not emitted');

    expect(messages(lines)).toEqual(['cache detail', 'later cache detail']);
  });

  describe('expiry', () => {
    it('restores the boot-time root level once the change expires', () => {
      const { logger, lines } = captureLogger({ level: 'info' });
      changeLogLevel(logger, { level: 'debug', ttlSeconds: 60, operator: 'ada' });

      vi.advanceTimersByTime(59_999);
      logger.debug('still debug');
      vi.advanceTimersByTime(1);
      logger.debug('not emitted');
      logger.info('back at info');

      expect(messages(lines)).toEqual(['still debug', 'back at info']);
    });

    it("restores a component's boot-time override, not the root level", () => {
      const { logger, lines } = captureLogger({ level: 'info', levelOverrides: { redis: 'warn' } });
      const redis = componentLogger(logger, 'redis');
      changeLogLevel(logger, {
        component: 'redis',
        level: 'debug',
        ttlSeconds: 60,
        operator: 'ada',
      });

      vi.advanceTimersByTime(60_000);
      redis.info('not emitted');
      componentLogger(logger, 'redis').info('not emitted either');
      redis.warn('back at warn');

      expect(messages(lines)).toEqual(['back at warn']);
    });

    it('lets a component with no boot-time override follow the root again', () => {
      const { logger, lines } = captureLogger({ level: 'info' });
      const redis = componentLogger(logger, 'redis');
      changeLogLevel(logger, {
        component: 'redis',
        level: 'warn',
        ttlSeconds: 60,
        operator: 'ada',
      });
      vi.advanceTimersByTime(60_000);

      changeLogLevel(logger, { level: 'debug', ttlSeconds: 60, operator: 'ada' });
      redis.debug('follows the root');

      expect(messages(lines)).toEqual(['follows the root']);
    });

    it('restarts the expiry when the same target is changed again', () => {
      const { logger, lines } = captureLogger({ level: 'info' });
      changeLogLevel(logger, { level: 'debug', ttlSeconds: 60, operator: 'ada' });
      vi.advanceTimersByTime(30_000);
      changeLogLevel(logger, { level: 'trace', ttlSeconds: 60, operator: 'ada' });

      vi.advanceTimersByTime(59_999);
      logger.trace('still trace');
      vi.advanceTimersByTime(1);
      logger.debug('not emitted');

      expect(messages(lines)).toEqual(['still trace']);
    });

    it('expires a root change and a component change independently', () => {
      const { logger, lines } = captureLogger({ level: 'info' });
      const redis = componentLogger(logger, 'redis');
      changeLogLevel(logger, {
        component: 'redis',
        level: 'trace',
        ttlSeconds: 120,
        operator: 'ada',
      });
      changeLogLevel(logger, { level: 'debug', ttlSeconds: 60, operator: 'ada' });

      vi.advanceTimersByTime(60_000);
      logger.debug('not emitted');
      redis.trace('redis still at trace');

      expect(messages(lines)).toEqual(['redis still at trace']);
    });
  });

  describe('the lines recording a change', () => {
    it('records who changed which level, from what, to what, and until when', () => {
      vi.setSystemTime(new Date('2026-10-02T09:00:00.000Z'));
      const { logger, lines } = captureLogger({ level: 'info', levelOverrides: { redis: 'warn' } });

      changeLogLevel(logger, {
        component: 'redis',
        level: 'debug',
        ttlSeconds: 900,
        operator: 'ada',
      });

      expect(lines).toEqual([
        expect.objectContaining({
          level: 30,
          'event.name': 'log.level.changed',
          'nebula.log.target': 'redis',
          'nebula.log.level.from': 'warn',
          'nebula.log.level.to': 'debug',
          'nebula.log.level.expires_at': '2026-10-02T09:15:00.000Z',
          'nebula.operator': 'ada',
        }),
      ]);
    });

    it('reports a component without an override as changing from the root level', () => {
      const { logger, lines } = captureLogger({ level: 'info' });

      changeLogLevel(logger, {
        component: 'http',
        level: 'debug',
        ttlSeconds: 60,
        operator: 'ada',
      });

      expect(lines[0]).toMatchObject({
        'nebula.log.target': 'http',
        'nebula.log.level.from': 'info',
      });
    });

    it('still records a change to a level that filters out info lines', () => {
      const { logger, lines } = captureLogger({ level: 'info' });

      changeLogLevel(logger, { level: 'error', ttlSeconds: 60, operator: 'ada' });

      expect(lines).toEqual([
        expect.objectContaining({
          'event.name': 'log.level.changed',
          'nebula.log.target': 'root',
          'nebula.log.level.from': 'info',
          'nebula.log.level.to': 'error',
        }),
      ]);
    });

    it('records the revert to the boot-time level', () => {
      const { logger, lines } = captureLogger({ level: 'info' });
      changeLogLevel(logger, { level: 'debug', ttlSeconds: 60, operator: 'ada' });

      vi.advanceTimersByTime(60_000);

      expect(lines[1]).toMatchObject({
        level: 30,
        'event.name': 'log.level.reverted',
        'nebula.log.target': 'root',
        'nebula.log.level.from': 'debug',
        'nebula.log.level.to': 'info',
        'nebula.operator': 'ada',
      });
    });
  });

  it('rejects a logger that createLogger did not build', () => {
    const { destination } = captureDestination();

    expect(() =>
      changeLogLevel(pino(destination), { level: 'debug', ttlSeconds: 60, operator: 'ada' }),
    ).toThrow(/createLogger/);
  });
});
