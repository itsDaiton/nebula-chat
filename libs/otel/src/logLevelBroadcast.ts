import { randomUUID } from 'node:crypto';
import { LOG_COMPONENTS } from './attributes';
import type { LogComponent } from './attributes';
import { changeLogLevel, readLogLevels } from './changeLogLevel';
import type { LogLevelChange, LogLevelState } from './levelControl';
import { logEvent } from './logEvent';
import type { Logger } from './logger';
import { LOG_LEVELS } from './logLevels';
import type { LogLevel } from './logLevels';

/** The longest a runtime level change may hold: a forgotten `trace` costs log volume. */
export const MAX_LOG_LEVEL_TTL_SECONDS = 4 * 60 * 60;

/** The transport a level change travels over. `@nebula-chat/redis`'s `pubsub` fits it. */
export type LogLevelPubSub = {
  /** Resolves to how many subscribers received the message. */
  publish: (channel: string, message: string) => Promise<number>;
  subscribe: (channel: string, onMessage: (message: string) => void) => Promise<void>;
  unsubscribe: (channel: string, onMessage: (message: string) => void) => Promise<void>;
};

/** One instance's answer to a report request: the levels it applies right now. */
export type LogLevelReport = { instance: string; levels: LogLevelState[] };

export type LogLevelReports = {
  /** How many instances received the request; more than `reports.length` means some never answered. */
  receivers: number;
  /** One per instance that answered in time, ordered by `instance`. */
  reports: LogLevelReport[];
};

// One channel per service, so a publish reaches only the targeted service's
// instances and its receiver count is theirs.
const channelFor = (serviceName: string): string => `log-level:${serviceName}`;
const reportChannelFor = (serviceName: string): string => `log-level-report:${serviceName}`;
// Each request gets its own reply channel, so concurrent requests never see each other's replies.
const replyPrefixFor = (serviceName: string): string => `log-level-reply:${serviceName}:`;

/** How long a report request waits for instances that received it but have not answered. */
const DEFAULT_REPORT_TIMEOUT_MS = 2000;

const isLogLevel = (value: unknown): value is LogLevel =>
  (LOG_LEVELS as readonly unknown[]).includes(value);

const isLogComponent = (value: unknown): value is LogComponent =>
  (LOG_COMPONENTS as readonly unknown[]).includes(value);

const isTtl = (value: unknown): value is number =>
  Number.isInteger(value) &&
  (value as number) >= 1 &&
  (value as number) <= MAX_LOG_LEVEL_TTL_SECONDS;

const parseJsonObject = (message: string): Record<string, unknown> | undefined => {
  try {
    const value: unknown = JSON.parse(message);
    return typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
};

const parseChange = (message: string): LogLevelChange | undefined => {
  const value = parseJsonObject(message);
  if (!value) {
    return undefined;
  }
  const { component, level, ttlSeconds, operator } = value;
  const valid =
    (component === undefined || isLogComponent(component)) &&
    isLogLevel(level) &&
    isTtl(ttlSeconds) &&
    typeof operator === 'string' &&
    operator.trim() !== '';
  return valid ? { component, level, ttlSeconds, operator } : undefined;
};

type PublishOptions = {
  pubsub: LogLevelPubSub;
  /** The `service.name` whose instances should change. */
  serviceName: string;
  change: LogLevelChange;
};

/**
 * Sends a level change to every running instance of one service. Resolves to
 * how many instances received it — 0 means none is listening.
 */
export const publishLogLevelChange = ({
  pubsub,
  serviceName,
  change,
}: PublishOptions): Promise<number> =>
  pubsub.publish(channelFor(serviceName), JSON.stringify(change));

const isLevelState = (value: unknown): value is LogLevelState => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { target, level, expiresAt, operator } = value as Record<string, unknown>;
  return (
    (target === 'root' || isLogComponent(target)) &&
    (level === 'silent' || isLogLevel(level)) &&
    (expiresAt === null || typeof expiresAt === 'string') &&
    (operator === null || typeof operator === 'string')
  );
};

const parseReport = (message: string): LogLevelReport | undefined => {
  const value = parseJsonObject(message);
  const valid =
    typeof value?.instance === 'string' &&
    Array.isArray(value.levels) &&
    value.levels.every(isLevelState);
  return valid
    ? { instance: value.instance as string, levels: value.levels as LogLevelState[] }
    : undefined;
};

type ListenOptions = {
  /** The root logger of this process, as `createLogger` built it. */
  logger: Logger;
  pubsub: LogLevelPubSub;
  /** This process's `service.name`: only changes aimed at it apply. */
  serviceName: string;
  /** Names this process in its answers to report requests; unique among the service's instances. */
  instanceId: string;
};

/**
 * Applies every level change published for this service to this process and answers each report request with its levels.
 * Never rejects: a failed subscription is logged and boot levels stay, so callers start it unawaited.
 */
export const listenForLogLevelChanges = async ({
  logger,
  pubsub,
  serviceName,
  instanceId,
}: ListenOptions): Promise<void> => {
  const reject = (what: string): void => {
    logEvent(logger, 'warn', 'log.level.message.rejected', {}, `Ignored a malformed ${what}`);
  };

  const onChange = (message: string): void => {
    const change = parseChange(message);
    if (change) {
      changeLogLevel(logger, change);
      return;
    }
    reject('log level change');
  };

  const onReportRequest = (message: string): void => {
    const replyTo = parseJsonObject(message)?.replyTo;
    // Replies only on this service's reply channels, so a request cannot aim them elsewhere.
    if (typeof replyTo !== 'string' || !replyTo.startsWith(replyPrefixFor(serviceName))) {
      reject('log level report request');
      return;
    }
    const report: LogLevelReport = { instance: instanceId, levels: readLogLevels(logger) };
    pubsub.publish(replyTo, JSON.stringify(report)).catch((err: unknown) => {
      logEvent(
        logger,
        'warn',
        'log.level.report.failed',
        { err },
        'Could not answer a log level report request',
      );
    });
  };

  try {
    await pubsub.subscribe(channelFor(serviceName), onChange);
    await pubsub.subscribe(reportChannelFor(serviceName), onReportRequest);
  } catch (err) {
    logEvent(
      logger,
      'warn',
      'log.level.listen.failed',
      { err },
      'Could not subscribe to log level changes; boot-time levels stay in force',
    );
  }
};

type CollectOptions = {
  pubsub: LogLevelPubSub;
  /** The `service.name` whose instances should report. */
  serviceName: string;
  timeoutMs?: number;
};

/**
 * Asks every running instance of one service for the levels it applies now, and
 * waits until all that received the request have answered, or `timeoutMs` passes.
 */
export const collectLogLevelReports = async ({
  pubsub,
  serviceName,
  timeoutMs = DEFAULT_REPORT_TIMEOUT_MS,
}: CollectOptions): Promise<LogLevelReports> => {
  const replyTo = `${replyPrefixFor(serviceName)}${randomUUID()}`;
  const reports: LogLevelReport[] = [];
  let expected = Number.POSITIVE_INFINITY;
  let settle = (): void => undefined;
  const allAnswered = new Promise<void>((resolve) => {
    settle = resolve;
  });

  const onReply = (message: string): void => {
    const report = parseReport(message);
    if (report) {
      reports.push(report);
      if (reports.length >= expected) settle();
    }
  };

  // Subscribed before publishing, so no reply can arrive ahead of its listener.
  await pubsub.subscribe(replyTo, onReply);
  try {
    const receivers = await pubsub.publish(
      reportChannelFor(serviceName),
      JSON.stringify({ replyTo }),
    );
    expected = receivers;
    if (reports.length < receivers) {
      const timer = setTimeout(settle, timeoutMs);
      await allAnswered;
      clearTimeout(timer);
    }
    return {
      receivers,
      reports: [...reports].sort((a, b) => a.instance.localeCompare(b.instance)),
    };
  } finally {
    // A failed unsubscribe leaves only an idle channel behind; the answer still stands.
    await pubsub.unsubscribe(replyTo, onReply).catch(() => undefined);
  }
};
