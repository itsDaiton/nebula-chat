import { LOG_COMPONENTS } from './attributes';
import type { LogComponent } from './attributes';
import { changeLogLevel } from './changeLogLevel';
import type { LogLevelChange } from './levelControl';
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
};

// One channel per service, so a publish reaches only the targeted service's
// instances and its receiver count is theirs.
const channelFor = (serviceName: string): string => `log-level:${serviceName}`;

const isLogLevel = (value: unknown): value is LogLevel =>
  (LOG_LEVELS as readonly unknown[]).includes(value);

const isLogComponent = (value: unknown): value is LogComponent =>
  (LOG_COMPONENTS as readonly unknown[]).includes(value);

const isTtl = (value: unknown): value is number =>
  Number.isInteger(value) &&
  (value as number) >= 1 &&
  (value as number) <= MAX_LOG_LEVEL_TTL_SECONDS;

const parseChange = (message: string): LogLevelChange | undefined => {
  let value: unknown;
  try {
    value = JSON.parse(message);
  } catch {
    return undefined;
  }
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const { component, level, ttlSeconds, operator } = value as Record<string, unknown>;
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

type ListenOptions = {
  /** The root logger of this process, as `createLogger` built it. */
  logger: Logger;
  pubsub: LogLevelPubSub;
  /** This process's `service.name`: only changes aimed at it apply. */
  serviceName: string;
};

/**
 * Applies every level change published for this service to this process's
 * logger tree. Never rejects: a failed subscription is logged and the boot-time
 * levels stay, so callers start it without awaiting.
 */
export const listenForLogLevelChanges = async ({
  logger,
  pubsub,
  serviceName,
}: ListenOptions): Promise<void> => {
  const onMessage = (message: string): void => {
    const change = parseChange(message);
    if (change) {
      changeLogLevel(logger, change);
      return;
    }
    logEvent(
      logger,
      'warn',
      'log.level.message.rejected',
      {},
      'Ignored a malformed log level change',
    );
  };

  try {
    await pubsub.subscribe(channelFor(serviceName), onMessage);
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
