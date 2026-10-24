import type { KnownAttributes, LogAttributes } from './attributes';

type BindableLogger<T> = { child: (bindings: LogAttributes) => T };

/**
 * A child logger carrying catalogue attributes on every line, the type-checked `logger.child({...})`; bind each key once per chain, since Pino concatenates bindings.
 */
export const bindAttributes = <T extends BindableLogger<T>, A extends LogAttributes>(
  logger: T,
  attributes: KnownAttributes<A>,
): T => logger.child(attributes);
