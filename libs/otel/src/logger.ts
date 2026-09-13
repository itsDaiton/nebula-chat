import pino from 'pino';

export type LoggerOptions = {
  level?: string;
  pretty?: boolean;
};

export const createLogger = (options: LoggerOptions = {}) =>
  pino({
    level: options.level ?? process.env.LOG_LEVEL ?? 'info',
    transport: options.pretty
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
      : undefined,
  });

export type Logger = ReturnType<typeof createLogger>;
