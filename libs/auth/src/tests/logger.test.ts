import { describe, it, expect, vi } from 'vitest';
import type { Logger } from '@nebula-chat/otel';
import { toBetterAuthLogHandler } from '../logger';

const makeLogger = () =>
  ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }) as unknown as Logger;

describe('toBetterAuthLogHandler', () => {
  it('routes each better-auth level to the matching Pino method', () => {
    const logger = makeLogger();
    const log = toBetterAuthLogHandler(logger);

    log('debug', 'd');
    log('info', 'i');
    log('warn', 'w');
    log('error', 'e');

    expect(logger.debug).toHaveBeenCalledWith('d');
    expect(logger.info).toHaveBeenCalledWith('i');
    expect(logger.warn).toHaveBeenCalledWith('w');
    expect(logger.error).toHaveBeenCalledWith('e');
  });

  it('forwards extra args through to the logger method', () => {
    const logger = makeLogger();
    const log = toBetterAuthLogHandler(logger);

    log('error', 'failed', { code: 500 }, 'extra');

    expect(logger.error).toHaveBeenCalledWith('failed', { code: 500 }, 'extra');
  });

  it('does not touch levels other than the one logged', () => {
    const logger = makeLogger();
    const log = toBetterAuthLogHandler(logger);

    log('info', 'only info');

    expect(logger.debug).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
