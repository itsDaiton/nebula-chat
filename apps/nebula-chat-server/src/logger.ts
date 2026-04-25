import pino from 'pino';
import { env } from '@backend/env';

export const logger = pino(
  env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {},
);
