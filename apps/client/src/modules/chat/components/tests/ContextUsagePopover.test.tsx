import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { getGetMessageAllowanceMockHandler } from '@/libs/api/generated/chat/chat.msw';
import { getListMessagesMockHandler } from '@/libs/api/generated/messages/messages.msw';
import type { Message } from '@/libs/api/generated/model/message';
import {
  getGetSessionMockHandler,
  getListSessionsMockHandler,
} from '@/libs/api/generated/sessions/sessions.msw';
import { useModelStore } from '@/modules/chat/stores/useModelStore';
import { aSession, mockGetSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const aMessage = (id: string, overrides: Partial<Message> = {}): Message => ({
  id,
  sessionId: SESSION_ID,
  content: 'hi',
  role: 'assistant',
  tokenCount: null,
  cached: false,
  createdAt: '2026-10-27T18:02:00.000Z',
  model: 'claude-3-5-haiku-20241022',
  estimatedCostUsd: null,
  runId: null,
  contextTokens: null,
  contextMessages: null,
  ...overrides,
});

const serveMessages = (messages: Message[]) => server.use(getListMessagesMockHandler(messages));

beforeEach(() => {
  localStorage.clear();
  useModelStore.setState({ selectedModel: 'gpt-4.1-mini' });
  server.use(
    mockGetSession(aSession()),
    getListSessionsMockHandler({ sessions: [], nextCursor: null, hasMore: false }),
    getGetMessageAllowanceMockHandler({ metered: false }),
    getGetSessionMockHandler({
      id: SESSION_ID,
      title: 'Run events in the SSE parser',
      createdAt: '2026-10-27T18:02:00.000Z',
      archived: false,
      archivedAt: null,
      messageCount: 4,
      activeStreamId: null,
      waitingRun: null,
    }),
  );
});

// 142,300 of the 191,808 tokens Claude 3.5 Haiku accepts (200,000 window, 8,192 reserved).
const usedMessages = () => [
  aMessage('m1', { role: 'user', model: null }),
  aMessage('m2', { contextTokens: 142_300, contextMessages: 20 }),
];

describe('Context window ring', () => {
  it('shows the percent in its label and the figures in a tooltip on focus', async () => {
    serveMessages(usedMessages());
    await renderRoute(`/s/${SESSION_ID}`);

    const ring = await screen.findByRole('button', { name: 'Context window, 74% used' });
    await userEvent.tab();
    ring.focus();

    expect(await screen.findByText('74% of context used · 142K / 192K tokens')).toBeInTheDocument();
  });

  it('opens a dialog with the details of the latest reply and its Model', async () => {
    serveMessages(usedMessages());
    await renderRoute(`/s/${SESSION_ID}`);

    await userEvent.click(await screen.findByRole('button', { name: /^Context window, 74%/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Context window' });
    expect(dialog).toHaveTextContent('Claude 3.5 Haiku');
    expect(dialog).toHaveTextContent('142,300 / 191,808');
    expect(dialog).toHaveTextContent('Messages includedlast 20 of 2');
    expect(dialog).toHaveTextContent('Reserved for the reply8,192 tokens');
    expect(screen.queryByRole('button', { name: 'New chat' })).not.toBeInTheDocument();
    expect(dialog).not.toHaveTextContent('tok ');
  });

  it('closes on Escape and returns focus to the ring', async () => {
    serveMessages(usedMessages());
    await renderRoute(`/s/${SESSION_ID}`);
    const ring = await screen.findByRole('button', { name: /^Context window, 74%/ });

    await userEvent.click(ring);
    await screen.findByRole('dialog', { name: 'Context window' });
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Context window' })).not.toBeInTheDocument();
    expect(ring).toHaveFocus();
  });

  it('is absent for answers from before the numbers were kept', async () => {
    serveMessages([aMessage('m1')]);
    await renderRoute(`/s/${SESSION_ID}`);

    await screen.findByRole('textbox', { name: 'Message' });
    expect(screen.queryByRole('button', { name: /^Context window/ })).not.toBeInTheDocument();
  });

  it('is absent on a new chat', async () => {
    await renderRoute('/');

    await screen.findByRole('textbox', { name: 'Message' });
    expect(screen.queryByRole('button', { name: /^Context window/ })).not.toBeInTheDocument();
  });
});
