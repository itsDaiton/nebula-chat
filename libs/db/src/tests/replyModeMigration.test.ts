import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { migrationsFolder } from '../env';

const sql = readFileSync(join(migrationsFolder, '0019_reply-mode.sql'), 'utf8');

describe('0019 reply-mode migration', () => {
  it('adds a not-null reply_mode that defaults to direct', () => {
    expect(sql).toContain('ADD COLUMN "reply_mode" text DEFAULT \'direct\' NOT NULL');
  });

  it('backfills run only for Sessions holding at least one Run', () => {
    expect(sql).toMatch(
      /UPDATE "sessions" SET "reply_mode" = 'run' WHERE EXISTS \(SELECT 1 FROM "runs" WHERE "runs"."session_id" = "sessions"."id"\)/,
    );
  });
});
