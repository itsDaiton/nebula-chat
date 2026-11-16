import { describe, expect, it } from 'vitest';
import type { Run } from '@/libs/api/generated/model/run';
import type { Step } from '@/libs/api/generated/model/step';
import { explainRunEnd } from '@/modules/inspector/utils/explainRunEnd';

const run = (overrides: Partial<Run>): Run =>
  ({ status: 'completed', brief: null, steps: [], ...overrides }) as Run;

const failed = (name: string, turn: number, message: string) =>
  ({
    name,
    turn,
    phase: 'delegate',
    status: 'failed',
    error: { success: false, error: 'Internal', message },
  }) as Step;

describe('explainRunEnd', () => {
  it('says nothing about a Run that completed or is still going', () => {
    expect(explainRunEnd(run({ status: 'completed' }))).toBeNull();
    expect(explainRunEnd(run({ status: 'running' }))).toBeNull();
    expect(explainRunEnd(run({ status: 'waiting' }))).toBeNull();
  });

  it('names the Step that made a Run partial, and its turn', () => {
    expect(
      explainRunEnd(run({ status: 'partial', steps: [failed('critic', 2, 'timed out')] })),
    ).toEqual({
      title: 'Partial answer.',
      reason: 'Reviewing (critic) failed in turn 2, so the answer was written without it.',
    });
  });

  it('names an Intake Agent missing from the Brief', () => {
    expect(
      explainRunEnd(run({ status: 'partial', brief: { language: null, missing: ['language'] } })),
    ).toEqual({
      title: 'Partial answer.',
      reason: 'Detecting the language (language) failed, so the answer was written without it.',
    });
  });

  it('falls back to the limits when no Step failed', () => {
    expect(explainRunEnd(run({ status: 'partial', brief: { missing: [] } }))?.reason).toBe(
      'A limit forced an early answer, or a Clarifying question went unanswered.',
    );
  });

  it('shows why a failed Run failed, from its last failed Step', () => {
    expect(
      explainRunEnd(
        run({
          status: 'failed',
          steps: [failed('analyst', 1, 'first'), failed('output', 0, 'The model timed out')],
        }),
      ),
    ).toEqual({ title: 'Run failed.', reason: 'The model timed out' });
    expect(explainRunEnd(run({ status: 'failed' }))?.reason).toBe(
      'It stopped before an answer was written.',
    );
  });

  it('says a cancelled Run was stopped', () => {
    expect(explainRunEnd(run({ status: 'cancelled' }))).toEqual({
      title: 'Run cancelled.',
      reason: 'It was stopped before it finished. The Steps it had completed are kept.',
    });
  });
});
