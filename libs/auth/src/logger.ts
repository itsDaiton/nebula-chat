import type { Logger } from '@nebula-chat/otel'

/**
 * better-auth's log levels as seen by a custom `logger.log` handler. better-auth's
 * own `LogLevel` includes `"success"`, but it never reaches the handler (it is
 * mapped to `"info"` upstream), so the handler only ever sees these four — which
 * map 1:1 onto the injected Pino logger's methods.
 */
export type BetterAuthLogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Adapt the injected `@nebula-chat/otel` (Pino) logger into a handler for
 * better-auth's `logger.log` option, so better-auth's internal logs flow through
 * the app's single structured sink instead of its default console formatter —
 * mirroring how `@nebula-chat/redis` treats the injected logger as its only sink.
 * The lib logs exclusively through the injected logger; it never touches
 * `console` or `process.env`.
 */
export const toBetterAuthLogHandler =
  (logger: Logger) =>
    (level: BetterAuthLogLevel, message: string, ...args: unknown[]): void => {
    // Pino's `LogFn` is an overload set whose object-first overloads reject a
    // spread of `unknown[]`; narrow to the plain `(message, ...args)` form (which
    // Pino supports) so the injected logger receives the message and its args.
      const log = logger[level] as (message: string, ...args: unknown[]) => void
      log(message, ...args)
    }
