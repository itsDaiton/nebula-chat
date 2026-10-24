import { componentLogger } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';

/**
 * better-auth's log levels as a `logger.log` handler sees them: `success` is mapped to `info` upstream, so only these four map onto Pino.
 */
export type BetterAuthLogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Adapts the injected Pino logger into better-auth's `logger.log`, stamping `auth.library.log` from `nebula.component: auth`,
 * with better-auth's text as `msg` and any extra arguments under `args`.
 */
export const toBetterAuthLogHandler = (logger: Logger) => {
  const log = componentLogger(logger, 'auth').child({ 'event.name': 'auth.library.log' });

  return (level: BetterAuthLogLevel, message: string, ...args: unknown[]): void => {
    // Pino v10 derives a call's variadic args from its literal format string,
    // so a non-literal message accepts none: the extras go in a bound object.
    if (args.length === 0) {
      log[level](message);
      return;
    }
    log[level]({ args }, message);
  };
};
