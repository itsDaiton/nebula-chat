import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { componentLogger } from '../componentLogger';
import { captureDestination, captureLogger } from './capture';

describe('componentLogger', () => {
  it('binds nebula.component on every line it writes', () => {
    const { logger, lines } = captureLogger();

    componentLogger(logger, 'redis').info('connected');

    expect(lines[0]?.['nebula.component']).toBe('redis');
  });

  it('lets an override lower one component below the root level', () => {
    const { logger, lines } = captureLogger({ level: 'info', levelOverrides: { redis: 'debug' } });

    componentLogger(logger, 'redis').debug('cache detail');
    logger.debug('root detail');

    expect(lines.map((l) => l.msg)).toEqual(['cache detail']);
  });

  it('lets an override raise one component above the root level', () => {
    const { logger, lines } = captureLogger({ level: 'debug', levelOverrides: { auth: 'warn' } });

    componentLogger(logger, 'auth').info('auth chatter');
    logger.info('root info');

    expect(lines.map((l) => l.msg)).toEqual(['root info']);
  });

  it('leaves components the map does not name at the root level', () => {
    const { logger, lines } = captureLogger({ level: 'info', levelOverrides: { redis: 'debug' } });

    componentLogger(logger, 'http').debug('not emitted');
    componentLogger(logger, 'http').info('emitted');

    expect(lines.map((l) => l.msg)).toEqual(['emitted']);
  });

  it('still resolves overrides from a child of the root, such as a request logger', () => {
    const { logger, lines } = captureLogger({ level: 'info', levelOverrides: { redis: 'debug' } });
    const requestLogger = logger.child({ 'http.request.id': 'req-1' });

    componentLogger(requestLogger, 'redis').debug('cache hit');

    expect(lines[0]).toMatchObject({
      msg: 'cache hit',
      'http.request.id': 'req-1',
      'nebula.component': 'redis',
    });
  });

  it('inherits the given logger level when that logger carries no overrides', () => {
    const { lines, destination } = captureDestination();
    const plain = pino({ level: 'warn' }, destination);

    componentLogger(plain, 'redis').info('not emitted');
    componentLogger(plain, 'redis').warn('emitted');

    expect(lines.map((l) => l.msg)).toEqual(['emitted']);
  });
});
