import { Writable } from 'node:stream';
import { DiagLogLevel, diag } from '@opentelemetry/api';
import pino from 'pino';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { attachDiagLogger, resolveDiagLevel } from '../diag';
import type { Logger } from '../logger';

type LogLine = { level: number; msg: string; component?: string; args?: unknown[] };

/**
 * A Pino logger whose output is captured in memory.
 *
 * `diag.setLogger` announces its own registration ("Registered a global for
 * diag vX") at debug level *through the logger being registered*, so that line
 * is dropped here — it is the OTel API talking about itself, not a diagnostic
 * the adapter under test produced.
 */
const captureLogger = (level = 'trace') => {
  const lines: LogLine[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      const line = JSON.parse(String(chunk)) as LogLine;
      if (!line.msg.startsWith('@opentelemetry/api:')) lines.push(line);
      callback();
    },
  });
  return { logger: pino({ level }, stream) as unknown as Logger, lines };
};

describe('resolveDiagLevel', () => {
  it.each([
    ['none', DiagLogLevel.NONE],
    ['error', DiagLogLevel.ERROR],
    ['warn', DiagLogLevel.WARN],
    ['info', DiagLogLevel.INFO],
    ['debug', DiagLogLevel.DEBUG],
    ['verbose', DiagLogLevel.VERBOSE],
    ['all', DiagLogLevel.ALL],
  ])('maps %s onto its DiagLogLevel', (raw, expected) => {
    expect(resolveDiagLevel(raw)).toBe(expected);
  });

  it('is case-insensitive and tolerates surrounding whitespace', () => {
    expect(resolveDiagLevel('  DEBUG  ')).toBe(DiagLogLevel.DEBUG);
  });

  it('defaults to ERROR for an absent value, not NONE', () => {
    // Silence is the failure mode this default exists to prevent: a broken
    // exporter must still be able to report itself.
    expect(resolveDiagLevel(undefined)).toBe(DiagLogLevel.ERROR);
  });

  it('defaults to ERROR for an unrecognised value', () => {
    expect(resolveDiagLevel('chatty')).toBe(DiagLogLevel.ERROR);
  });

  it('defaults to ERROR for an empty string', () => {
    expect(resolveDiagLevel('')).toBe(DiagLogLevel.ERROR);
  });
});

describe('attachDiagLogger', () => {
  beforeEach(() => {
    diag.disable();
  });

  afterEach(() => {
    diag.disable();
  });

  it("tags every diagnostic with component 'otel'", () => {
    const { logger, lines } = captureLogger();
    attachDiagLogger(logger, 'all');

    diag.error('exporter unreachable');

    expect(lines[0].component).toBe('otel');
    expect(lines[0].msg).toBe('exporter unreachable');
  });

  it('routes each DiagLogger method onto its Pino level', () => {
    const { logger, lines } = captureLogger();
    attachDiagLogger(logger, 'all');

    diag.error('e');
    diag.warn('w');
    diag.info('i');
    diag.debug('d');
    diag.verbose('v');

    // Pino numeric levels: trace 10, debug 20, info 30, warn 40, error 50.
    expect(lines.map((l) => l.level)).toEqual([50, 40, 30, 20, 10]);
  });

  it('binds extra arguments into an object instead of interpolating them', () => {
    const { logger, lines } = captureLogger();
    attachDiagLogger(logger, 'all');

    diag.error('export failed', { status: 503 }, 'retrying');

    expect(lines[0].msg).toBe('export failed');
    expect(lines[0].args).toEqual([{ status: 503 }, 'retrying']);
  });

  it('omits the args object when the diagnostic carries no extras', () => {
    const { logger, lines } = captureLogger();
    attachDiagLogger(logger, 'all');

    diag.error('bare message');

    expect(lines[0].args).toBeUndefined();
  });

  it('suppresses diagnostics below the requested level', () => {
    const { logger, lines } = captureLogger();
    attachDiagLogger(logger, 'error');

    diag.debug('should not appear');
    diag.error('should appear');

    expect(lines).toHaveLength(1);
    expect(lines[0].msg).toBe('should appear');
  });

  it("emits nothing at all when the level is 'none'", () => {
    const { logger, lines } = captureLogger();
    attachDiagLogger(logger, 'none');

    diag.error('silenced');

    expect(lines).toEqual([]);
  });

  it('lets OTEL_LOG_LEVEL raise verbosity above the parent logger level', () => {
    // The parent sits at 'info'; without the child carrying its own level,
    // Pino would swallow the debug diagnostic regardless of OTEL_LOG_LEVEL.
    const { logger, lines } = captureLogger('info');

    attachDiagLogger(logger, 'debug');
    diag.debug('sdk detail');

    expect(lines.map((l) => l.msg)).toEqual(['sdk detail']);
  });

  it('defaults to error-level diagnostics when no level is given', () => {
    const { logger, lines } = captureLogger();
    attachDiagLogger(logger);

    diag.warn('not emitted at default level');
    diag.error('emitted');

    expect(lines.map((l) => l.msg)).toEqual(['emitted']);
  });
});
