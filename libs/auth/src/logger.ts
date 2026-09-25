import { componentLogger } from '@nebula-chat/otel';
import type { Logger } from '@nebula-chat/otel';

/**
 * better-auth's log levels as seen by a custom `logger.log` handler. better-auth's
 * own `LogLevel` includes `"success"`, but it never reaches the handler (it is
 * mapped to `"info"` upstream), so the handler only ever sees these four — which
 * map 1:1 onto the injected Pino logger's methods.
 */
export type BetterAuthLogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Adapt the injected `@nebula-chat/otel` (Pino) logger into a handler for
 * better-auth's `logger.log` option, so better-auth's internal logs flow through
 * the app's single structured sink instead of its default console formatter —
 * mirroring how `@nebula-chat/redis` treats the injected logger as its only sink.
 * The lib logs exclusively through the injected logger; it never touches
 * `console` or `process.env`.
 *
 * A stamped adapter: every line is `event.name: auth.library.log` from
 * `nebula.component: auth`, with better-auth's own text as `msg` and any extra
 * arguments gathered under `args` — the same shape `@nebula-chat/otel`'s diag
 * adapter gives the OTel SDK's lines.
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
