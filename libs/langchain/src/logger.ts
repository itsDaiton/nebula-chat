// Duck-typed against Pino's logging signature so the lib does not depend on Pino.
// Consumers may pass a Pino logger directly, or any object with this shape.
export type LLMLogger = {
  info: (obj: object, msg?: string) => void;
  warn: (obj: object, msg?: string) => void;
  error: (obj: object, msg?: string) => void;
};
