import { createLogger } from '../logger';
import type { CreateLoggerOptions } from '../logger';
import { captureDestination } from '../testing';

/** A `createLogger` logger at `info` (unless overridden) and the lines it writes. */
export const captureLogger = (options: Partial<CreateLoggerOptions> = {}) => {
  const { lines, destination } = captureDestination();
  const logger = createLogger({
    serviceName: 'test-service',
    level: 'info',
    destination,
    ...options,
  });
  return { logger, lines };
};
