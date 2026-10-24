// Duck-typed against Pino's logging signature so the lib needn't depend on Pino; the server's `logEvent` loggers fit as-is.
export type LLMLogger = {
  debug: (obj: object, msg?: string) => void;
  info: (obj: object, msg?: string) => void;
  warn: (obj: object, msg?: string) => void;
  error: (obj: object, msg?: string) => void;
};
