import type { KnownAttributes, LogAttributes } from './attributes';
import type { LogEventName } from './events';
import type { LogLevel } from './logLevels';

type LogMethod = (obj: object, msg?: string) => void;

/**
 * The structural shape `logEvent` writes through, deliberately not Pino's `Logger`, so duck-typed loggers (langchain's `LLMLogger`) fit.
 */
export type EventLogger<L extends LogLevel = LogLevel> = { readonly [K in L]: LogMethod };

/**
 * Writes one line: `event.name`, catalogue attributes and a human `msg`; an unknown event or key is a compile error.
 * Thin over Pino on purpose: bind context shared by many lines on a child with `bindAttributes`.
 */
export const logEvent = <L extends LogLevel, A extends LogAttributes>(
  logger: EventLogger<NoInfer<L>>,
  level: L,
  event: LogEventName,
  attributes: KnownAttributes<A>,
  msg: string,
): void => {
  logger[level]({ 'event.name': event, ...attributes }, msg);
};
