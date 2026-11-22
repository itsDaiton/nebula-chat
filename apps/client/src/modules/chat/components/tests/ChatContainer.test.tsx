import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getGetMessageAllowanceMockHandler,
  getSendMessageMockHandler,
} from '@/libs/api/generated/chat/chat.msw';
import { getListMessagesMockHandler } from '@/libs/api/generated/messages/messages.msw';
import {
  getGetSessionMockHandler,
  getListSessionsMockHandler,
} from '@/libs/api/generated/sessions/sessions.msw';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { IDLE_REPLY } from '@/modules/chat/utils/replyState';
import { resources } from '@/resources';
import { API_ROUTE } from '@/test/api';
import { holdSession } from '@/test/auth';
import { mockReplyStream, sseFrame } from '@/test/chat';
import { server } from '@/test/msw';
import { renderRoute } from '@/test/renderRoute';

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const STREAM_ID = '33333333-3333-4333-8333-333333333333';

const aMessage = (id: string, role: string, content: string) => ({
  id,
  sessionId: SESSION_ID,
  role,
  content,
  tokenCount: null,
  cached: false,
  model: null,
  estimatedCostUsd: null,
  runId: null,
  contextTokens: null,
  contextMessages: null,
  createdAt: '2026-06-15T11:00:00.000Z',
});

describe('ChatContainer regenerate', () => {
  beforeEach(() => {
    useChatStreamStore.setState({
      history: [],
      reply: IDLE_REPLY,
      usage: null,
      sessionId: undefined,
      streamId: null,
      cancelledRunId: null,
    });
  });

  it.each(['run', 'direct'] as const)('in a %s Session sends that mode', async (replyMode) => {
    await holdSession({ isAnonymous: false, emailVerified: true });
    const sent: unknown[] = [];
    server.use(
      getListSessionsMockHandler({ sessions: [], nextCursor: null, hasMore: false }),
      getGetMessageAllowanceMockHandler({ metered: false }),
      getGetSessionMockHandler({
        id: SESSION_ID,
        title: 'Chat',
        createdAt: '2026-06-15T11:00:00.000Z',
        archived: false,
        archivedAt: null,
        messageCount: 2,
        replyMode,
        activeStreamId: null,
        waitingRun: null,
      }),
      getListMessagesMockHandler([
        aMessage('m1', 'user', 'keep BullMQ?'),
        aMessage('m2', 'assistant', 'Keep BullMQ.'),
      ]),
      getSendMessageMockHandler(async ({ request }) => {
        sent.push(await request.json());
        return { messageId: '22222222-2222-4222-8222-222222222222', streamId: STREAM_ID };
      }),
      mockReplyStream(sseFrame('token', { token: 'Again.' }), sseFrame('end', {})),
      http.get(API_ROUTE.run, () => new HttpResponse(null, { status: 404 })),
    );
    await renderRoute(`/s/${SESSION_ID}`);

    await userEvent.click(
      await screen.findByRole('button', { name: resources.chat.meta.regenerate }),
    );

    await waitFor(() => expect(sent).toMatchObject([{ content: 'keep BullMQ?', mode: replyMode }]));
    expect(await screen.findByText('Again.')).toBeInTheDocument();
  });
});
