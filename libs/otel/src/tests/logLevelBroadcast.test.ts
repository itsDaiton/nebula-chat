import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  collectLogLevelReports,
  listenForLogLevelChanges,
  publishLogLevelChange,
} from '../logLevelBroadcast';
import type { LogLevelPubSub } from '../logLevelBroadcast';
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
    await listenForLogLevelChanges({
      logger: first.logger,
      pubsub,
      serviceName: 'server',
      instanceId: 'a',
    });
    await listenForLogLevelChanges({
      logger: second.logger,
      pubsub,
      serviceName: 'server',
      instanceId: 'b',
    });

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
    await listenForLogLevelChanges({ logger, pubsub, serviceName: 'server', instanceId: 'a' });

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
    await listenForLogLevelChanges({
      logger: worker.logger,
      pubsub,
      serviceName: 'worker',
      instanceId: 'a',
    });

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
    await listenForLogLevelChanges({ logger, pubsub, serviceName: 'server', instanceId: 'a' });

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
      unsubscribe: async () => undefined,
    };

    await listenForLogLevelChanges({ logger, pubsub, serviceName: 'server', instanceId: 'a' });

    expect(lines).toEqual([
      expect.objectContaining({
        level: 40,
        'event.name': 'log.level.listen.failed',
        err: expect.objectContaining({ message: 'redis down' }),
      }),
    ]);
  });
});

describe('log level reports', () => {
  const NOW = new Date('2026-10-02T09:00:00.000Z');
  const REPORT_CHANNEL = 'log-level-report:server';

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Starts one instance of `server` listening, named `instanceId`. */
  const listen = async (
    pubsub: LogLevelPubSub,
    instanceId: string,
    options: Parameters<typeof captureLogger>[0] = {},
  ) => {
    const running = captureLogger(options);
    await listenForLogLevelChanges({
      logger: running.logger,
      pubsub,
      serviceName: 'server',
      instanceId,
    });
    return running;
  };

  it('reports the root and every component with the level each instance applies, and why', async () => {
    vi.useFakeTimers({ now: NOW });
    const pubsub = memoryPubSub();
    await listen(pubsub, 'web-1', { levelOverrides: { redis: 'warn' } });
    await publishLogLevelChange({
      pubsub,
      serviceName: 'server',
      change: { component: 'llm', level: 'trace', ttlSeconds: 600, operator: 'ada' },
    });

    const result = await collectLogLevelReports({ pubsub, serviceName: 'server' });

    expect(result).toEqual({
      receivers: 1,
      reports: [
        {
          instance: 'web-1',
          levels: [
            { target: 'root', level: 'info', expiresAt: null, operator: null },
            { target: 'auth', level: 'info', expiresAt: null, operator: null },
            { target: 'chat', level: 'info', expiresAt: null, operator: null },
            { target: 'http', level: 'info', expiresAt: null, operator: null },
            {
              target: 'llm',
              level: 'trace',
              expiresAt: '2026-10-02T09:10:00.000Z',
              operator: 'ada',
            },
            { target: 'otel', level: 'info', expiresAt: null, operator: null },
            { target: 'redis', level: 'warn', expiresAt: null, operator: null },
          ],
        },
      ],
    });
  });

  it('reports the boot-time level again once a change has expired', async () => {
    vi.useFakeTimers({ now: NOW });
    const pubsub = memoryPubSub();
    await listen(pubsub, 'web-1');
    await publishLogLevelChange({
      pubsub,
      serviceName: 'server',
      change: { level: 'debug', ttlSeconds: 60, operator: 'ada' },
    });
    vi.advanceTimersByTime(60_000);

    const { reports } = await collectLogLevelReports({ pubsub, serviceName: 'server' });

    expect(reports[0]?.levels[0]).toEqual({
      target: 'root',
      level: 'info',
      expiresAt: null,
      operator: null,
    });
  });

  it('collects one report per instance, ordered by instance, so drift between them shows', async () => {
    const pubsub = memoryPubSub();
    await listen(pubsub, 'web-2', { level: 'debug' });
    await listen(pubsub, 'web-1');

    const { receivers, reports } = await collectLogLevelReports({ pubsub, serviceName: 'server' });

    expect(receivers).toBe(2);
    expect(reports.map((r) => [r.instance, r.levels[0]?.level])).toEqual([
      ['web-1', 'info'],
      ['web-2', 'debug'],
    ]);
  });

  it('answers at once with no reports when no instance is listening', async () => {
    const pubsub = memoryPubSub();
    await listen(pubsub, 'web-1');

    const result = await collectLogLevelReports({ pubsub, serviceName: 'worker' });

    expect(result).toEqual({ receivers: 0, reports: [] });
  });

  it('gives up on an instance that received the request but never answers', async () => {
    vi.useFakeTimers();
    const pubsub = memoryPubSub();
    await listen(pubsub, 'web-1');
    await pubsub.subscribe(REPORT_CHANNEL, () => undefined);

    const pending = collectLogLevelReports({ pubsub, serviceName: 'server', timeoutMs: 500 });
    await vi.advanceTimersByTimeAsync(500);
    const { receivers, reports } = await pending;

    expect(receivers).toBe(2);
    expect(reports.map((r) => r.instance)).toEqual(['web-1']);
  });

  it('ignores a malformed reply rather than counting it as an answer', async () => {
    vi.useFakeTimers();
    const pubsub = memoryPubSub();
    await pubsub.subscribe(REPORT_CHANNEL, (message) => {
      const { replyTo } = JSON.parse(message) as { replyTo: string };
      void pubsub.publish(replyTo, JSON.stringify({ instance: 'web-1', levels: [{}] }));
    });

    const pending = collectLogLevelReports({ pubsub, serviceName: 'server', timeoutMs: 500 });
    await vi.advanceTimersByTimeAsync(500);

    expect(await pending).toEqual({ receivers: 1, reports: [] });
  });

  it('leaves its reply channel once it has the answers', async () => {
    const pubsub = memoryPubSub();
    await listen(pubsub, 'web-1');

    await collectLogLevelReports({ pubsub, serviceName: 'server' });

    expect(pubsub.channels().filter((c) => c.startsWith('log-level-reply:'))).toEqual([]);
  });

  it.each([
    ['text that is not JSON', 'not json'],
    ['no reply channel', JSON.stringify({})],
    ['a reply channel outside the protocol', JSON.stringify({ replyTo: 'log-level:server' })],
    ["another service's reply channel", JSON.stringify({ replyTo: 'log-level-reply:worker:abc' })],
  ])('answers no report request carrying %s, with a warning', async (_case, message) => {
    const pubsub = memoryPubSub();
    const { lines } = await listen(pubsub, 'web-1');
    const published = vi.spyOn(pubsub, 'publish');

    await pubsub.publish(REPORT_CHANNEL, message);

    expect(published).toHaveBeenCalledTimes(1);
    expect(lines).toEqual([
      expect.objectContaining({ level: 40, 'event.name': 'log.level.message.rejected' }),
    ]);
  });

  it('logs a warning when it cannot send its report', async () => {
    const pubsub = memoryPubSub();
    const { lines } = await listen(pubsub, 'web-1');
    const deliver = pubsub.publish;
    vi.spyOn(pubsub, 'publish').mockImplementation(async (channel, message) => {
      if (channel.startsWith('log-level-reply:')) throw new Error('redis down');
      return deliver(channel, message);
    });

    await pubsub.publish(REPORT_CHANNEL, JSON.stringify({ replyTo: 'log-level-reply:server:abc' }));
    await vi.waitFor(() => expect(lines).toHaveLength(1));

    expect(lines).toEqual([
      expect.objectContaining({
        level: 40,
        'event.name': 'log.level.report.failed',
        err: expect.objectContaining({ message: 'redis down' }),
      }),
    ]);
  });
});
