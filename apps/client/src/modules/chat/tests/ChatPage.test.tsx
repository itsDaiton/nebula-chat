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
import { aMeteredAllowance } from '@/test/allowance';
import { aSession, holdSession, mockGetSession } from '@/test/auth';
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
  archived: false,
});

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

    expect(
      await screen.findByRole('textbox', { name: resources.chat.composer.label }),
    ).toBeInTheDocument();
  });

  it('renders the composer', async () => {
    await renderPage();

    expect(
      await screen.findByRole('textbox', { name: resources.chat.composer.label }),
    ).toBeInTheDocument();
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
      expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0),
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
        return {
          id: SESSION_ID,
          title: 'Brand new chat',
          createdAt: '2026-10-20T00:00:00.000Z',
          archived: false,
        };
      }),
      getSendMessageMockHandler({
        messageId: '22222222-2222-4222-8222-222222222222',
        streamId: '33333333-3333-4333-8333-333333333333',
      }),
      mockReplyStream(sseFrame('token', { token: 'hi there' }), sseFrame('end', {})),
    );
    await renderPage();
    expect(await screen.findByText(resources.sessions.empty)).toBeInTheDocument();

    await userEvent.type(
      screen.getByRole('textbox', { name: resources.chat.composer.label }),
      'hello{Enter}',
    );

    expect(await screen.findByText('Brand new chat')).toBeInTheDocument();
  });

  it('fills the composer from a starter prompt', async () => {
    await holdSession({ isAnonymous: false, emailVerified: true });
    await renderPage();
    const pool: string[] = resources.chat.starters.map(({ prompt }) => prompt);
    const starter = (await screen.findAllByRole('button')).find((button) =>
      pool.includes(button.textContent ?? ''),
    );

    await userEvent.click(starter!);
    const prompt = starter!.textContent;

    expect(screen.getByRole('textbox', { name: resources.chat.composer.label })).toHaveValue(
      prompt,
    );
  });

  it('adds a newline on Shift+Enter and sends on Enter', async () => {
    let sends = 0;
    server.use(
      getCreateSessionMockHandler(aChatSession(SESSION_ID, 'hello')),
      getSendMessageMockHandler(() => {
        sends += 1;
        return {
          messageId: '22222222-2222-4222-8222-222222222222',
          streamId: '33333333-3333-4333-8333-333333333333',
        };
      }),
      mockReplyStream(sseFrame('token', { token: 'hi' }), sseFrame('end', {})),
    );
    await renderPage();
    const box = await screen.findByRole('textbox', { name: resources.chat.composer.label });

    await userEvent.type(box, 'one{Shift>}{Enter}{/Shift}two');

    expect(box).toHaveValue('one\ntwo');
    expect(sends).toBe(0);

    await userEvent.type(box, '{Enter}');

    await waitFor(() => expect(sends).toBe(1));
  });

  it('keeps the same composer mounted when the thread replaces the empty state', async () => {
    // A remount unsubscribes the allowance footer, which cancels the allowance check the send is awaiting.
    server.use(
      getCreateSessionMockHandler(aChatSession(SESSION_ID, 'hello')),
      getSendMessageMockHandler({
        messageId: '22222222-2222-4222-8222-222222222222',
        streamId: '33333333-3333-4333-8333-333333333333',
      }),
      mockReplyStream(sseFrame('token', { token: 'hi' }), sseFrame('end', {})),
    );
    await renderPage();
    const box = await screen.findByRole('textbox', { name: resources.chat.composer.label });

    await userEvent.type(box, 'hello{Enter}');
    expect(await screen.findByText('hello')).toBeInTheDocument();

    expect(box).toBeInTheDocument();
  });

  it('shows the Run toggle disabled, and the allowance counter under the composer', async () => {
    await holdSession({ isAnonymous: true });
    server.use(mockGetSession(aSession()), getGetMessageAllowanceMockHandler(aMeteredAllowance(3)));
    await renderPage();

    expect(await screen.findByText('3 of 10 messages left')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: resources.chat.run.label })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  describe('when the first reply of a new chat fails', () => {
    const PROVIDER_ERROR = 'The model provider rejected the request';

    const serveFailedFirstReply = (onCreate = vi.fn()) => {
      server.use(
        getCreateSessionMockHandler(() => {
          onCreate();
          return aChatSession(SESSION_ID, 'hello');
        }),
        getSendMessageMockHandler({
          messageId: '22222222-2222-4222-8222-222222222222',
          streamId: '33333333-3333-4333-8333-333333333333',
        }),
        mockReplyStream(
          sseFrame('error', { success: false, error: 'Internal', message: PROVIDER_ERROR }),
          sseFrame('end', {}),
        ),
      );
      return onCreate;
    };

    it('keeps the message and shows the error where the reply would be, not the greeting', async () => {
      serveFailedFirstReply();
      await renderPage();

      await userEvent.type(
        await screen.findByRole('textbox', { name: resources.chat.composer.label }),
        'hello{Enter}',
      );

      expect(await screen.findByText(PROVIDER_ERROR)).toBeInTheDocument();
      expect(screen.getByText('hello', { selector: 'p, div, span' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    });

    it('keeps the error once the Session it created has loaded', async () => {
      serveFailedFirstReply();
      server.use(getListMessagesMockHandler([aMessage('m1', 'user', 'hello')]));
      await renderPage();

      await userEvent.type(
        await screen.findByRole('textbox', { name: resources.chat.composer.label }),
        'hello{Enter}',
      );
      await screen.findByText(PROVIDER_ERROR);

      await waitFor(() => expect(useChatStreamStore.getState().isStreaming).toBe(false));
      expect(screen.getByText(PROVIDER_ERROR)).toBeInTheDocument();
      expect(screen.queryByText(resources.chat.emptySession)).not.toBeInTheDocument();
    });

    it('continues the Session the failed attempt created instead of starting another', async () => {
      const onCreate = serveFailedFirstReply();
      await renderPage();
      await userEvent.type(
        await screen.findByRole('textbox', { name: resources.chat.composer.label }),
        'hello{Enter}',
      );
      await screen.findByText(PROVIDER_ERROR);
      await waitFor(() => expect(useChatStreamStore.getState().isStreaming).toBe(false));

      await userEvent.type(
        screen.getByRole('textbox', { name: resources.chat.composer.label }),
        'again{Enter}',
      );

      expect(await screen.findByText('again')).toBeInTheDocument();
      await waitFor(() => expect(screen.getAllByText(PROVIDER_ERROR)).toHaveLength(2));
      expect(onCreate).toHaveBeenCalledTimes(1);
    });
  });

  it('renders on a mobile layout without the side panels', async () => {
    layout.isMobile = true;
    layout.showSidePanels = false;

    await renderPage();

    expect(
      await screen.findByRole('textbox', { name: resources.chat.composer.label }),
    ).toBeInTheDocument();

    layout.isMobile = false;
    layout.showSidePanels = true;
  });
});
