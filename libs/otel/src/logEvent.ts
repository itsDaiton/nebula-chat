import type { KnownAttributes, LogAttributes } from './attributes';
import type { LogEventName } from './events';

/** Pino's six levels, from most to least severe. */
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

type LogMethod = (obj: object, msg?: string) => void;

/**
 * The structural shape `logEvent` writes through: one method per level it is
 * asked to use. Deliberately not Pino's `Logger`, so a duck-typed logger (such
 * as `@nebula-chat/langchain`'s `LLMLogger`) can be passed too.
 */
export type EventLogger<L extends LogLevel = LogLevel> = { readonly [K in L]: LogMethod };

/**
 * Writes one line: `event.name`, the catalogue attributes, and a human `msg`.
 * An unknown event name or attribute key is a compile error.
 *
 * Stays thin over Pino on purpose — no buffering, no enrichment. Context that
 * applies to many lines (the User, the Session) is bound on a child logger
 * with `bindAttributes` instead of repeated here.
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
