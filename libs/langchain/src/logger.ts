// Duck-typed against Pino's logging signature so the lib does not depend on Pino.
// Consumers may pass a Pino logger directly, or any object with this shape.
// Structurally what `@nebula-chat/otel`'s `logEvent` writes through, so the
// server's loggers fit it as-is.
export type LLMLogger = {
  debug: (obj: object, msg?: string) => void;
  info: (obj: object, msg?: string) => void;
  warn: (obj: object, msg?: string) => void;
  error: (obj: object, msg?: string) => void;
};
