import { waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Message } from '@/libs/api/generated/model/message';
import { getListMessagesMockHandler } from '@/libs/api/generated/messages/messages.msw';
import { useContextUsage } from '@/modules/chat/hooks/useContextUsage';
import { server } from '@/test/msw';
import { renderHookWithQueryClient } from '@/test/render';

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
// gpt-4.1-mini in the test catalog: 1,047,576 window, 32,768 reserved → 1,014,808 budget.
const MODEL = 'gpt-4.1-mini';
const BUDGET = 1_047_576 - 32_768;

const aMessage = (id: string, overrides: Partial<Message> = {}): Message => ({
  id,
  sessionId: SESSION_ID,
  content: 'hi',
  role: 'assistant',
  tokenCount: null,
  cached: false,
  createdAt: '2026-10-27T18:02:00.000Z',
  model: MODEL,
  estimatedCostUsd: null,
  runId: null,
  contextTokens: null,
  contextMessages: null,
  ...overrides,
});

const usageOf = async (messages: Message[], sessionId: string | undefined = SESSION_ID) => {
  server.use(getListMessagesMockHandler(messages));
  const { result, queryClient } = renderHookWithQueryClient(() => useContextUsage(sessionId));
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  return result;
};

describe('useContextUsage', () => {
  it('measures the latest Direct reply against the Model input budget', async () => {
    const result = await usageOf([
      aMessage('m1', { role: 'user' }),
      aMessage('m2', { contextTokens: 1_000, contextMessages: 1 }),
      aMessage('m3', { role: 'user' }),
      aMessage('m4', { contextTokens: BUDGET / 2, contextMessages: 3 }),
    ]);

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toMatchObject({
      model: expect.objectContaining({ value: MODEL, label: 'GPT-4.1 mini' }),
      used: BUDGET / 2,
      budget: BUDGET,
      percent: 50,
      level: 'normal',
      messagesIncluded: 3,
      messagesTotal: 4,
    });
  });

  it.each([
    [0.69, 'normal'],
    [0.696, 'warning'],
    [0.7, 'warning'],
    [0.89, 'warning'],
    [0.9, 'critical'],
  ] as const)('at %s of the budget the level is %s', async (share, level) => {
    const result = await usageOf([
      aMessage('m1', { contextTokens: BUDGET * share, contextMessages: 1 }),
    ]);

    await waitFor(() => expect(result.current?.level).toBe(level));
  });

  it('clamps the fill at 100%', async () => {
    const result = await usageOf([
      aMessage('m1', { contextTokens: BUDGET * 2, contextMessages: 1 }),
    ]);

    await waitFor(() => expect(result.current?.percent).toBe(100));
    expect(result.current?.level).toBe('critical');
  });

  it('uses the Model the numbers came from, not the picker', async () => {
    const result = await usageOf([
      aMessage('m1', { model: 'gpt-4o', contextTokens: 1_000, contextMessages: 1 }),
    ]);

    await waitFor(() => expect(result.current?.model.value).toBe('gpt-4o'));
    expect(result.current?.budget).toBe(128_000 - 16_384);
  });

  it.each([
    ['a new chat', [], undefined],
    ['a Session with no replies', [aMessage('m1', { role: 'user', model: null })], SESSION_ID],
    ['a reply from before the numbers were kept', [aMessage('m1')], SESSION_ID],
    [
      'a Run answer',
      [aMessage('m1', { runId: 'r1', contextTokens: 5, contextMessages: 1 })],
      SESSION_ID,
    ],
    [
      'a Model the catalog no longer lists',
      [aMessage('m1', { model: 'retired', contextTokens: 5, contextMessages: 1 })],
      SESSION_ID,
    ],
  ] as const)('is hidden for %s', async (_name, messages, sessionId) => {
    const result = await usageOf([...messages], sessionId);

    expect(result.current).toBeNull();
  });
});
