import { describe, expect, it } from 'vitest';
import { listenForLogLevelChanges, publishLogLevelChange } from '../logLevelBroadcast';
import { captureLogger } from './capture';
import { memoryPubSub } from './memoryPubSub';

/** One running process: a logger at `info` and the lines it writes. */
const instance = () => captureLogger();

const change = { level: 'debug', ttlSeconds: 60, operator: 'ada' } as const;

describe('log level broadcast', () => {
  it('changes the level on every listening instance of the targeted service', async () => {
    const pubsub = memoryPubSub();
    const first = instance();
    const second = instance();
    await listenForLogLevelChanges({ logger: first.logger, pubsub, serviceName: 'server' });
    await listenForLogLevelChanges({ logger: second.logger, pubsub, serviceName: 'server' });

    const receivers = await publishLogLevelChange({ pubsub, serviceName: 'server', change });
    first.logger.debug('first instance detail');
    second.logger.debug('second instance detail');

    expect(receivers).toBe(2);
    expect(first.lines.map((l) => l.msg)).toContain('first instance detail');
    expect(second.lines.map((l) => l.msg)).toContain('second instance detail');
  });

  it("carries a component change and the operator's name across", async () => {
    const pubsub = memoryPubSub();
    const { logger, lines } = instance();
    await listenForLogLevelChanges({ logger, pubsub, serviceName: 'server' });

    await publishLogLevelChange({
      pubsub,
      serviceName: 'server',
      change: { ...change, component: 'redis' },
    });

    expect(lines).toEqual([
      expect.objectContaining({
        'event.name': 'log.level.changed',
        'nebula.log.target': 'redis',
        'nebula.log.level.to': 'debug',
        'nebula.operator': 'ada',
      }),
    ]);
  });

  it('leaves instances of another service alone', async () => {
    const pubsub = memoryPubSub();
    const worker = instance();
    await listenForLogLevelChanges({ logger: worker.logger, pubsub, serviceName: 'worker' });

    const receivers = await publishLogLevelChange({ pubsub, serviceName: 'server', change });
    worker.logger.debug('not emitted');

    expect(receivers).toBe(0);
    expect(worker.lines).toEqual([]);
  });

  it.each([
    ['text that is not JSON', 'not json'],
    ['a JSON value that is not an object', '"debug"'],
    ['an unknown level', JSON.stringify({ ...change, level: 'verbose' })],
    ['an unknown component', JSON.stringify({ ...change, component: 'billing' })],
    ['a fractional expiry', JSON.stringify({ ...change, ttlSeconds: 1.5 })],
    ['an expiry of zero', JSON.stringify({ ...change, ttlSeconds: 0 })],
    ['an expiry past the maximum', JSON.stringify({ ...change, ttlSeconds: 4 * 60 * 60 + 1 })],
    ['a blank operator', JSON.stringify({ ...change, operator: ' ' })],
    ['no operator', JSON.stringify({ level: 'debug', ttlSeconds: 60 })],
  ])('ignores a message carrying %s, with a warning', async (_case, message) => {
    const pubsub = memoryPubSub();
    const { logger, lines } = instance();
    await listenForLogLevelChanges({ logger, pubsub, serviceName: 'server' });

    await pubsub.publish(pubsub.channels()[0] ?? '', message);
    logger.debug('not emitted');

    expect(lines).toEqual([
      expect.objectContaining({ level: 40, 'event.name': 'log.level.message.rejected' }),
    ]);
  });

  it('keeps the boot-time levels, with a warning, when it cannot subscribe', async () => {
    const { logger, lines } = instance();
    const pubsub = {
      publish: async () => 0,
      subscribe: () => Promise.reject(new Error('redis down')),
    };

    await listenForLogLevelChanges({ logger, pubsub, serviceName: 'server' });

    expect(lines).toEqual([
      expect.objectContaining({
        level: 40,
        'event.name': 'log.level.listen.failed',
        err: expect.objectContaining({ message: 'redis down' }),
      }),
    ]);
  });
});
