import { describe, expect, it } from 'vitest';
import type { ChatMessage, RunStepProgress, SseEvent } from '@/modules/chat/types/types';
import { applyStreamEvent } from '@/modules/chat/streaming/applyStreamEvent';
import { resources } from '@/resources';

const user: ChatMessage = { id: 'u1', role: 'user', content: 'what is 2+2?' };
const reply = (patch: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'a1',
  role: 'assistant',
  content: '',
  ...patch,
});
const frame = (event: SseEvent, data: unknown) => ({ event, data: JSON.stringify(data) });

const step: RunStepProgress = {
  stepId: 's1',
  attempt: 1,
  phase: 'output',
  agent: 'writer',
  label: 'Writing the answer',
  status: 'running',
  turn: 0,
  parentStepId: null,
};
const stepStarted = { ...step, status: undefined };

describe('applyStreamEvent — token', () => {
  it('appends the token to the trailing reply', () => {
    const { history, end } = applyStreamEvent(
      [user, reply({ content: '2+2' })],
      frame('token', { token: ' is 4' }),
    );

    expect(history).toEqual([user, reply({ content: '2+2 is 4' })]);
    expect(end).toBeUndefined();
  });

  it('leaves the chat alone without a trailing reply or a token', () => {
    expect(applyStreamEvent([user], frame('token', { token: 'x' })).history).toEqual([user]);
    expect(applyStreamEvent([user, reply()], frame('token', {})).history).toEqual([user, reply()]);
  });
});

describe('applyStreamEvent — usage', () => {
  it('reports the counts and puts the total on the reply', () => {
    const result = applyStreamEvent(
      [user, reply({ content: '4' })],
      frame('usage', { promptTokens: 10, completionTokens: 2, totalTokens: 12 }),
    );

    expect(result).toEqual({
      history: [user, reply({ content: '4', tokenCount: 12 })],
      usage: { promptTokens: 10, completionTokens: 2, totalTokens: 12 },
    });
  });
});

describe('applyStreamEvent — Run events', () => {
  it('adds a started Step and names the Run as stale', () => {
    const result = applyStreamEvent(
      [user, reply({ runId: 'r1', run: { steps: [], status: null } })],
      frame('step-started', stepStarted),
    );

    expect(result.history.at(-1)?.run).toEqual({ steps: [step], status: null });
    expect(result.staleRunId).toBe('r1');
  });

  it('resets a Step in place on a higher attempt, dropping what its Output wrote', () => {
    const result = applyStreamEvent(
      [user, reply({ content: 'draft', runId: 'r1', run: { steps: [step], status: null } })],
      frame('step-started', { ...stepStarted, attempt: 2 }),
    );

    expect(result.history.at(-1)).toMatchObject({
      content: '',
      run: { steps: [{ ...step, attempt: 2 }] },
    });
  });

  it('takes the Run id and status from run-finished', () => {
    const result = applyStreamEvent(
      [user, reply({ run: { steps: [], status: null } })],
      frame('run-finished', { runId: 'r2', status: 'completed' }),
    );

    expect(result.history.at(-1)).toMatchObject({ runId: 'r2', run: { status: 'completed' } });
    expect(result.staleRunId).toBe('r2');
  });

  it('ignores a Run event whose data is malformed', () => {
    const history = [user, reply({ runId: 'r1' })];

    expect(applyStreamEvent(history, frame('step-finished', { stepId: 1 }))).toEqual({ history });
  });
});

describe('applyStreamEvent — run-waiting', () => {
  it('turns the reply into the saved Clarifying question', () => {
    const result = applyStreamEvent(
      [user, reply()],
      frame('run-waiting', { runId: 'r1', questionMessageId: 'q1', question: 'Which year?' }),
    );

    expect(result.history).toEqual([
      user,
      reply({ id: 'q1', content: 'Which year?', runId: 'r1' }),
    ]);
    expect(result.end).toBeUndefined();
  });

  it('ignores a question without its Message id', () => {
    const history = [user, reply()];

    expect(applyStreamEvent(history, frame('run-waiting', { question: 'Which?' }))).toEqual({
      history,
    });
  });
});

describe('applyStreamEvent — error', () => {
  it('ends a Direct reply as failed with the error as its text', () => {
    const result = applyStreamEvent(
      [user, reply({ content: 'half' })],
      frame('error', { success: false, error: 'Internal', message: 'Provider down' }),
    );

    expect(result).toEqual({
      history: [user, reply({ content: 'Provider down' })],
      end: { status: 'failed', error: 'Provider down' },
    });
  });

  it('falls back to the generic message for an unreadable error', () => {
    expect(applyStreamEvent([user, reply()], frame('error', null)).end).toEqual({
      status: 'failed',
      error: resources.chat.streamError,
    });
  });

  it('marks a Run failed but reads on to its run-finished', () => {
    const result = applyStreamEvent(
      [user, reply({ run: { steps: [step], status: null } })],
      frame('error', { success: false, error: 'Internal', message: 'Critic crashed' }),
    );

    expect(result.history.at(-1)).toMatchObject({
      content: 'Critic crashed',
      run: { status: 'failed' },
    });
    expect(result.end).toBeUndefined();
  });
});

describe('applyStreamEvent — end', () => {
  it('rests a finished reply at idle', () => {
    const history = [user, reply({ content: '4' })];

    expect(applyStreamEvent(history, frame('end', {}))).toEqual({
      history,
      end: { status: 'idle' },
    });
  });

  it('ends a failed Run as failed with the error it showed', () => {
    const history = [
      user,
      reply({ content: 'Critic crashed', run: { steps: [], status: 'failed' } }),
    ];

    expect(applyStreamEvent(history, frame('end', {})).end).toEqual({
      status: 'failed',
      error: 'Critic crashed',
    });
  });

  it('drops an empty stopped reply', () => {
    expect(applyStreamEvent([user, reply()], frame('end', { reason: 'cancelled' }))).toEqual({
      history: [user],
      end: { status: 'stopped' },
    });
  });

  it('keeps a stopped reply that has text or Steps', () => {
    const withText = [user, reply({ content: '2+' })];
    const withSteps = [user, reply({ run: { steps: [step], status: 'cancelled' } })];

    expect(applyStreamEvent(withText, frame('end', { reason: 'cancelled' })).history).toEqual(
      withText,
    );
    expect(applyStreamEvent(withSteps, frame('end', { reason: 'cancelled' })).history).toEqual(
      withSteps,
    );
  });
});
