import type { Run } from '@/libs/api/generated/model/run';
import type { Step } from '@/libs/api/generated/model/step';

export const RUN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const at = (seconds: number) =>
  new Date(Date.UTC(2026, 9, 27, 21, 14, 0) + seconds * 1000).toISOString();

/** A completed Step lasting `seconds`; pass `overrides` for a failed or running one. */
export const aStep = (
  id: string,
  phase: Step['phase'],
  name: string,
  seconds: number,
  overrides: Partial<Step> = {},
): Step => ({
  id,
  turn: 0,
  phase,
  name,
  parentStepId: null,
  attempt: 1,
  input: { model: 'gpt-4.1-mini', system: `You are the ${name}.`, human: `input of ${id}` },
  output: { result: `output of ${id}` },
  tokens: 1200,
  status: 'completed',
  error: null,
  startedAt: at(0),
  finishedAt: at(seconds),
  ...overrides,
});

/** The Run of `run-finished.png`: partial, because the critic failed in turn 2. */
export const aRun = (overrides: Partial<Run> = {}): Run => ({
  id: RUN_ID,
  sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  status: 'partial',
  brief: {
    language: { language: 'English', englishRestatement: 'Compare BullMQ and Redis Streams.' },
    session: { summary: 'The user owns the worker app.' },
    missing: [],
  },
  tokensUsed: 38410,
  tokenBudget: 60000,
  createdAt: at(-1),
  startedAt: at(0),
  finishedAt: at(41.2),
  steps: [
    aStep('language', 'intake', 'language', 0.8),
    aStep('session', 'intake', 'session', 2.1),
    aStep('plan-1', 'orchestrator', 'orchestrator', 3.4, { turn: 1 }),
    aStep('analyst-1', 'delegate', 'analyst', 6, { turn: 1, parentStepId: 'plan-1' }),
    aStep('critic-1', 'delegate', 'critic', 4.2, { turn: 1, parentStepId: 'plan-1' }),
    aStep('plan-2', 'orchestrator', 'orchestrator', 2.9, { turn: 2 }),
    aStep('analyst-2', 'delegate', 'analyst', 5.5, { turn: 2, parentStepId: 'plan-2' }),
    aStep('critic-2', 'delegate', 'critic', 3, {
      turn: 2,
      parentStepId: 'plan-2',
      status: 'failed',
      input: { model: 'claude-3-5-haiku-20241022', task: 'Challenge the ops-cost claim.' },
      output: null,
      tokens: 2912,
      error: { success: false, error: 'Internal', message: 'The model timed out' },
    }),
    aStep('output', 'output', 'output', 13.3, { output: { answer: 'Keep BullMQ.' } }),
  ],
  ...overrides,
});
