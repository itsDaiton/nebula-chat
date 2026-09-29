import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadDatabaseUrl, migrationsFolder, migrationsSchema, migrationsTable } from '../env';

describe('loadDatabaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns DATABASE_URL from the environment', () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pw@localhost:5432/nebula');

    expect(loadDatabaseUrl()).toBe('postgresql://user:pw@localhost:5432/nebula');
  });

  it('throws a named error when DATABASE_URL is unset', () => {
    // Unset in the environment must fail even on a machine with a server
    // `.env`: the package scripts load that file, this code never does.
    vi.stubEnv('DATABASE_URL', undefined);

    expect(() => loadDatabaseUrl()).toThrow('DATABASE_URL is required');
  });

  it('treats an empty DATABASE_URL as missing', () => {
    vi.stubEnv('DATABASE_URL', '');

    expect(() => loadDatabaseUrl()).toThrow('DATABASE_URL is required');
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
