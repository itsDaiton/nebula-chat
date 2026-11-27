import { describe, expect, it } from 'vitest';
import type { Run } from '@/libs/api/generated/model/run';
import { briefParts } from '@/modules/inspector/utils/briefParts';

const language = { language: 'Czech', englishRestatement: 'Hello' };

describe('briefParts', () => {
  it('shows nothing for an Agent the Brief names skipped', () => {
    const brief = { language, session: null, missing: [], skipped: ['session'] };

    expect(briefParts(brief).map(({ agent }) => agent)).toEqual(['language']);
  });

  it('renders a Brief saved before `skipped` existed', () => {
    const brief = { language, session: { summary: 'Earlier chat.' }, missing: [] } as NonNullable<
      Run['brief']
    >;

    expect(briefParts(brief).map(({ agent }) => agent)).toEqual(['language', 'session']);
  });

  it('keeps a failed Agent’s part, told as missing', () => {
    const brief = { language, session: null, missing: ['session'], skipped: [] };

    expect(briefParts(brief).map(({ agent }) => agent)).toEqual(['language', 'session']);
  });
});
