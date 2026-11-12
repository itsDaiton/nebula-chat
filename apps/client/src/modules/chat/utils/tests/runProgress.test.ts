import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '@/modules/chat/types/types';
import { applyRunEvent, parseRunEvent } from '@/modules/chat/utils/runProgress';

const reply: ChatMessage = { id: 'a1', role: 'assistant', content: '' };
const started = {
  stepId: 's1',
  attempt: 1,
  phase: 'intake',
  agent: 'language',
  label: 'Detecting',
  turn: 0,
  parentStepId: null,
} as const;

describe('parseRunEvent', () => {
  it('reads a delegate Step starting, with its turn and the Step that launched it', () => {
    const delegate = { ...started, phase: 'delegate', turn: 2, parentStepId: 'plan-2' };

    expect(parseRunEvent('step-started', { ...delegate, extra: 'ignored' })).toEqual({
      type: 'step-started',
      ...delegate,
    });
  });

  it.each(['turn', 'parentStepId'] as const)('drops a Step starting without its %s', (field) => {
    expect(parseRunEvent('step-started', { ...started, [field]: undefined })).toBeNull();
  });

  it.each([
    ['step-started', { stepId: 's1' }],
    ['step-started', { ...started, phase: 'warp' }],
    ['step-finished', { stepId: 's1', status: 'running' }],
    ['run-finished', { runId: 'r1', status: 'waiting' }],
    ['run-finished', null],
  ] as const)('rejects a malformed %s', (event, data) => {
    expect(parseRunEvent(event, data)).toBeNull();
  });
});

describe('applyRunEvent', () => {
  it('ignores a Step finishing that never started', () => {
    expect(applyRunEvent(reply, { type: 'step-finished', stepId: 's9', status: 'completed' })).toBe(
      reply,
    );
  });

  it('keeps the answer when a Step other than the Output Step runs again', () => {
    const first = applyRunEvent(
      { ...reply, content: 'so far' },
      { type: 'step-started', ...started },
    );

    const again = applyRunEvent(first, { type: 'step-started', ...started, attempt: 2 });

    expect(again.content).toBe('so far');
    expect(again.run?.steps).toEqual([{ ...started, attempt: 2, status: 'running' }]);
  });
});
