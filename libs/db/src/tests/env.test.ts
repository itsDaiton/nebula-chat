import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadDatabaseUrl, migrationsFolder, migrationsSchema, migrationsTable } from '../env';

const originalUrl = process.env['DATABASE_URL'];

describe('loadDatabaseUrl', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env['DATABASE_URL'];
    else process.env['DATABASE_URL'] = originalUrl;
  });

  it('returns DATABASE_URL when it is already present in the environment', () => {
    process.env['DATABASE_URL'] = 'postgresql://user:pw@localhost:5432/nebula';

    expect(loadDatabaseUrl()).toBe('postgresql://user:pw@localhost:5432/nebula');
  });

  it('throws a named error when DATABASE_URL is absent', () => {
    delete process.env['DATABASE_URL'];
    // CI/CD injects the variable directly and ships no .env, so the absent-file
    // path must be reached without masking the missing-variable error.
    vi.spyOn(process, 'loadEnvFile').mockImplementation(() => {
      throw new Error('ENOENT');
    });

    expect(() => loadDatabaseUrl()).toThrow('DATABASE_URL is required');
  });

  it('treats an empty DATABASE_URL as missing', () => {
    process.env['DATABASE_URL'] = '';
    vi.spyOn(process, 'loadEnvFile').mockImplementation(() => undefined);

    expect(() => loadDatabaseUrl()).toThrow('DATABASE_URL is required');
  });

  it("swallows a missing .env rather than surfacing the loader's error", () => {
    process.env['DATABASE_URL'] = 'postgresql://fallback/db';
    vi.spyOn(process, 'loadEnvFile').mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory');
    });

    expect(loadDatabaseUrl()).toBe('postgresql://fallback/db');
  });

  it("reads the server's .env so both it and the migration tooling share one source", () => {
    process.env['DATABASE_URL'] = 'postgresql://from-env-file/db';
    const spy = vi.spyOn(process, 'loadEnvFile').mockImplementation(() => undefined);

    loadDatabaseUrl();

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('apps/nebula-chat-server/.env'));
  });
});

describe('migration journal constants', () => {
  it('points the migrations folder at this package', () => {
    expect(migrationsFolder).toMatch(/libs[/\\]db[/\\]migrations$/);
  });

  it('matches the journal table drizzle.config.ts writes to', () => {
    // A mismatch here reads the journal from the wrong table and silently
    // replays or skips migrations.
    expect(migrationsTable).toBe('__drizzle_migrations');
    expect(migrationsSchema).toBe('public');
  });
});
