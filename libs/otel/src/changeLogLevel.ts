import type { Logger } from './logger';
import { levelControlOf } from './levelControl';
import type { LogLevelChange, LogLevelState } from './levelControl';

/**
 * Changes the root level, or one component's, on a running logger tree, and
 * restores the boot-time level after `ttlSeconds`. Reaches existing loggers too;
 * only a root change skips in-flight requests, whose level Fastify fixed at start.
 */
export const changeLogLevel = (logger: Logger, change: LogLevelChange): void => {
  const control = levelControlOf(logger);
  if (!control) {
    throw new Error('changeLogLevel needs a logger built by createLogger');
  }
  control.change(change);
};

/** The root's level, then every component's, as this logger tree applies them now. */
export const readLogLevels = (logger: Logger): LogLevelState[] => {
  const control = levelControlOf(logger);
  if (!control) {
    throw new Error('readLogLevels needs a logger built by createLogger');
  }
  return control.snapshot();
};
