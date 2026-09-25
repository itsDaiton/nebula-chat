import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { LogAttributes } from '../attributes';
import type { LogEventName } from '../events';
import { logEvent } from '../logEvent';
import { createLogger } from '../logger';
import { captureDestination } from './capture';

const capture = () => {
  const { lines, destination } = captureDestination();
  return {
    logger: createLogger({ serviceName: 'test-service', level: 'trace', destination }),
    lines,
  };
};

describe('logEvent', () => {
  it('writes event.name, the attributes and the message at the given level', () => {
    const { logger, lines } = capture();

    logEvent(
      logger,
      'info',
      'http.request.completed',
      { 'http.request.method': 'GET', 'http.response.status_code': 200 },
      'GET /health 200',
    );

    expect(lines).toEqual([
      expect.objectContaining({
        level: 30,
        'event.name': 'http.request.completed',
        'http.request.method': 'GET',
        'http.response.status_code': 200,
        msg: 'GET /health 200',
      }),
    ]);
  });

  it.each([
    ['fatal', 60],
    ['error', 50],
    ['warn', 40],
    ['info', 30],
    ['debug', 20],
    ['trace', 10],
  ] as const)('writes at %s', (level, numeric) => {
    const { logger, lines } = capture();

    logEvent(logger, level, 'server.started', {}, 'up');

    expect(lines[0]?.level).toBe(numeric);
  });

  it('drops attributes whose value is undefined', () => {
    const { logger, lines } = capture();

    logEvent(logger, 'info', 'chat.reply.completed', { 'nebula.message.id': undefined }, 'done');

    expect(lines[0]).not.toHaveProperty('nebula.message.id');
  });

  it('keeps err an object so the serializer emits its stack', () => {
    const { logger, lines } = capture();

    logEvent(logger, 'error', 'http.request.failed', { err: new Error('boom') }, 'failed');

    expect(lines[0]?.err).toMatchObject({
      type: 'Error',
      message: 'boom',
      stack: expect.any(String),
    });
  });

  it('accepts a duck-typed logger that only has the level it is asked for', () => {
    const debug = vi.fn();

    logEvent({ debug }, 'debug', 'llm.stream.started', { 'gen_ai.provider.name': 'openai' }, 'go');

    expect(debug).toHaveBeenCalledWith(
      { 'event.name': 'llm.stream.started', 'gen_ai.provider.name': 'openai' },
      'go',
    );
  });

  describe('compile-time catalogue', () => {
    it('rejects an unknown event name', () => {
      const { logger } = capture();

      // @ts-expect-error -- not in the event catalogue
      logEvent(logger, 'info', 'http.request.finished', {}, 'x');
    });

    it('rejects an unknown attribute key in a literal', () => {
      const { logger } = capture();

      // @ts-expect-error -- not in the attribute catalogue
      logEvent(logger, 'info', 'server.started', { 'session.id': 's-1' }, 'x');
    });

    it('rejects an unknown attribute key held in a variable', () => {
      const { logger } = capture();
      const attributes = { 'server.port': 3000, userId: 'u-1' };

      // @ts-expect-error -- `userId` is not a catalogue key, even outside a literal
      logEvent(logger, 'info', 'server.started', attributes, 'x');
    });

    it('rejects an attribute of the wrong type', () => {
      const { logger } = capture();
      const attributes = { 'http.response.status_code': '200' };

      // @ts-expect-error -- status codes are numbers
      logEvent(logger, 'info', 'http.request.completed', attributes, 'x');
    });

    it('rejects a level the logger does not have', () => {
      // Caught at compile time; were it to slip through, the call would throw.
      expect(() =>
        // @ts-expect-error -- the duck-typed logger has no `error`
        logEvent({ debug: vi.fn() }, 'error', 'server.start.failed', {}, 'x'),
      ).toThrow(TypeError);
    });

    it('names the Session nebula.session.id, never the OTel session.id', () => {
      expectTypeOf<LogAttributes>().toHaveProperty('nebula.session.id');
      expectTypeOf<LogAttributes>().not.toHaveProperty('session.id');
    });

    it('exposes the event names as a closed union', () => {
      expectTypeOf<'chat.reply.completed'>().toExtend<LogEventName>();
      expectTypeOf<'chat.request.received'>().not.toExtend<LogEventName>();
    });
  });
});
