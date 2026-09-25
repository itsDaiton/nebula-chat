// Logger
export { createLogger } from './logger';
export type { CreateLoggerOptions, Logger } from './logger';
export type { LevelOverrides } from './levelOverrides';

// Line conventions: the attribute + event catalogue and the typed writers
export { ATTR } from './attributes';
export type {
  KnownAttributes,
  LogAttributeKey,
  LogAttributes,
  LogAttributeValues,
  LogComponent,
} from './attributes';
export { LOG_EVENTS } from './events';
export type { LogEventName } from './events';
export { logEvent } from './logEvent';
export type { EventLogger, LogLevel } from './logEvent';
export { bindAttributes } from './bindAttributes';
export { componentLogger } from './componentLogger';

// Tracing
export { initTelemetry } from './tracing';
