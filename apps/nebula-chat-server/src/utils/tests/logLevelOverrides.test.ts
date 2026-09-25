import { describe, expect, it } from 'vitest';
import { logLevelOverridesSchema } from '@backend/utils/logLevelOverrides';

describe('logLevelOverridesSchema', () => {
  it('parses comma-separated component=level pairs into a map', () => {
    expect(logLevelOverridesSchema.parse('redis=debug,auth=warn')).toEqual({
      redis: 'debug',
      auth: 'warn',
    });
  });

  it('tolerates whitespace around entries, names and levels', () => {
    expect(logLevelOverridesSchema.parse(' redis = debug , http=trace ')).toEqual({
      redis: 'debug',
      http: 'trace',
    });
  });

  it('accepts silent, to mute one component', () => {
    expect(logLevelOverridesSchema.parse('auth=silent')).toEqual({ auth: 'silent' });
  });

  it('skips empty entries, so a trailing comma is harmless', () => {
    expect(logLevelOverridesSchema.parse('redis=debug,')).toEqual({ redis: 'debug' });
  });

  it('reads an empty value as no overrides', () => {
    expect(logLevelOverridesSchema.parse('')).toEqual({});
  });

  it('reads an unset variable as no overrides', () => {
    expect(logLevelOverridesSchema.parse(undefined)).toEqual({});
  });

  it('accepts any component name, known or not', () => {
    expect(logLevelOverridesSchema.parse('worker=info')).toEqual({ worker: 'info' });
  });

  it('rejects an unknown level, naming the entry', () => {
    const result = logLevelOverridesSchema.safeParse('redis=verbose');

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('redis=verbose');
  });

  it('rejects an entry without a level', () => {
    expect(logLevelOverridesSchema.safeParse('redis').success).toBe(false);
  });

  it('rejects an entry without a component', () => {
    expect(logLevelOverridesSchema.safeParse('=debug').success).toBe(false);
  });

  it('rejects an entry with more than one =', () => {
    expect(logLevelOverridesSchema.safeParse('redis=debug=trace').success).toBe(false);
  });
});
