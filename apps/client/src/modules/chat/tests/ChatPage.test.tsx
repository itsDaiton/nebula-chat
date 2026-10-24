import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, delay, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCreateSessionMockHandler,
  getGetSessionMockHandler,
  getListSessionsMockHandler,
} from '@/libs/api/generated/sessions/sessions.msw';
import {
  getGetMessageAllowanceMockHandler,
  getSendMessageMockHandler,
} from '@/libs/api/generated/chat/chat.msw';
import { getListMessagesMockHandler } from '@/libs/api/generated/messages/messages.msw';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { toaster } from '@/shared/components/ui/toaster';
import { resources } from '@/resources';
import { renderRoute } from '@/test/renderRoute';
import { API_ROUTE, mockApiError } from '@/test/api';
import { aSession, mockGetSession } from '@/test/auth';
import { mockReplyStream, sseFrame } from '@/test/chat';
import { server } from '@/test/msw';

vi.mock('@/theme/hooks/useColorMode', () => ({
  useColorMode: () => ({ colorMode: 'light', toggleColorMode: vi.fn() }),
}));

const layout = vi.hoisted(() => ({
  isMobile: false,
  showSidePanels: true,
  showRightPanel: false,
}));
vi.mock('@/shared/hooks/useResponsiveLayout', () => ({ useResponsiveLayout: () => layout }));

const SESSION_ID = '11111111-1111-4111-8111-111111111111';

const aChatSession = (id: string, title: string) => ({
  id,
  title,
  createdAt: '2026-06-15T11:00:00.000Z',
});

const aMessage = (id: string, role: string, content: string) => ({
  id,
  sessionId: SESSION_ID,
  role,
  content,
  tokenCount: null,
  cached: false,
  createdAt: '2026-06-15T11:00:00.000Z',
});

const serveSessions = (...sessions: ReturnType<typeof aChatSession>[]) =>
  server.use(getListSessionsMockHandler({ sessions, nextCursor: null, hasMore: false }));

const renderPage = (path = '/') => renderRoute(path);

beforeEach(() => {
  vi.restoreAllMocks();
  serveSessions();
  server.use(
    mockGetSession(aSession()),
    getGetSessionMockHandler({ ...aChatSession(SESSION_ID, 'Chat'), activeStreamId: null }),
    getListMessagesMockHandler([]),
    getGetMessageAllowanceMockHandler({ metered: false }),
  );
  useMessageStore.setState({ message: '' });
  useChatStreamStore.setState({
    history: [],
    isStreaming: false,
    isPostStreamNavigation: false,
    error: null,
    usage: null,
    sessionId: undefined,
  });
});

describe('ChatPage', () => {
  it('welcomes the user on a brand new chat', async () => {
    await renderPage();

    expect(await screen.findByText(resources.chat.welcomeMessage)).toBeInTheDocument();
  });

  it('renders the composer', async () => {
    await renderPage();

    expect(await screen.findByRole('textbox', { name: '' })).toBeInTheDocument();
  });

  it('lists the sessions the API returns on a desktop layout', async () => {
    serveSessions(aChatSession('a', 'Earlier chat'));

    await renderPage();

    expect(await screen.findByText('Earlier chat')).toBeInTheDocument();
  });

  it('shows the empty-list hint when there are no sessions', async () => {
    await renderPage();

    expect(await screen.findByText(resources.sessions.empty)).toBeInTheDocument();
  });

  it('shows loading skeletons while sessions load', async () => {
    server.use(
      getListSessionsMockHandler(async () => {
        await delay('infinite');
        return { sessions: [], nextCursor: null, hasMore: false };
      }),
    );

    const { container } = await renderPage();

    await waitFor(() =>
      expect(container.querySelectorAll('.chakra-skeleton').length).toBeGreaterThan(0),
    );
  });

  it('shows the error in the sidebar when the sessions fail to load', async () => {
    server.use(
      mockApiError('get', API_ROUTE.sessions, 401, {
        success: false,
        error: 'Unauthorized',
        message: 'No authenticated session',
      }),
    );

    await renderPage();

    expect(await screen.findByText('No authenticated session')).toBeInTheDocument();
  });

  it('renders the messages of an open session', async () => {
    server.use(
      getListMessagesMockHandler([
        aMessage('m1', 'user', 'a question'),
        aMessage('m2', 'assistant', 'an answer'),
      ]),
    );

    await renderPage(`/s/${SESSION_ID}`);

    expect(await screen.findByText('a question', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText('an answer')).toBeInTheDocument();
  });

  it('re-attaches to a reply still streaming when the session is opened mid-reply', async () => {
    const STREAM_ID = '33333333-3333-4333-8333-333333333333';
    let opened: unknown;
    server.use(
      getGetSessionMockHandler({ ...aChatSession(SESSION_ID, 'Chat'), activeStreamId: STREAM_ID }),
      getListMessagesMockHandler([aMessage('m1', 'user', 'what is 2+2?')]),
      http.get(API_ROUTE.replyStream, ({ params }) => {
        opened = params['streamId'];
        return new HttpResponse(
          sseFrame('token', { token: 'Two plus two' }, '1-1') +
            sseFrame('token', { token: ' is four' }, '1-2') +
            sseFrame('end', {}, '1-3'),
          { headers: { 'Content-Type': 'text/event-stream' } },
        );
      }),
    );

    await renderPage(`/s/${SESSION_ID}`);

    expect(
      await screen.findByText('Two plus two is four', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('what is 2+2?')).toBeInTheDocument();
    expect(opened).toBe(STREAM_ID);
  });

  it('surfaces a session load failure inline and through the toaster', async () => {
    const toast = vi.spyOn(toaster, 'create');
    server.use(
      mockApiError('get', API_ROUTE.session, 404, {
        success: false,
        error: 'NotFound',
        message: 'Session not found',
      }),
    );

    await renderPage(`/s/${SESSION_ID}`);

    expect(
      await screen.findByText(resources.sessions.single.error, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Session not found', { selector: 'p' })).toBeInTheDocument();
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', description: 'Session not found' }),
    );
  });

  it('shows a session created by a reply in the sidebar without a refresh', async () => {
    let created = false;
    server.use(
      getListSessionsMockHandler(() => ({
        sessions: created ? [aChatSession(SESSION_ID, 'Brand new chat')] : [],
        nextCursor: null,
        hasMore: false,
      })),
      getCreateSessionMockHandler(() => {
        created = true;
        return { id: SESSION_ID, title: 'Brand new chat', createdAt: '2026-10-20T00:00:00.000Z' };
      }),
      getSendMessageMockHandler({
        messageId: '22222222-2222-4222-8222-222222222222',
        streamId: '33333333-3333-4333-8333-333333333333',
      }),
      mockReplyStream(sseFrame('token', { token: 'hi there' }), sseFrame('end', {})),
    );
    await renderPage();
    expect(await screen.findByText(resources.sessions.empty)).toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox', { name: '' }), 'hello{Enter}');

    expect(await screen.findByText('Brand new chat')).toBeInTheDocument();
  });

  it('renders on a mobile layout without the side panels', async () => {
    layout.isMobile = true;
    layout.showSidePanels = false;

    await renderPage();

    expect(await screen.findByText(resources.chat.welcomeMessage)).toBeInTheDocument();

    layout.isMobile = false;
    layout.showSidePanels = true;
  });
});
