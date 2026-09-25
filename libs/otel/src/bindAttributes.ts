import type { KnownAttributes, LogAttributes } from './attributes';

type BindableLogger<T> = { child: (bindings: LogAttributes) => T };

/**
 * A child logger carrying catalogue attributes on every line it writes — the
 * type-checked form of `logger.child({...})`. Bind each key once per logger
 * chain: Pino concatenates bindings, so binding a key twice emits it twice.
 */
export const bindAttributes = <T extends BindableLogger<T>, A extends LogAttributes>(
  logger: T,
  attributes: KnownAttributes<A>,
): T => logger.child(attributes);
