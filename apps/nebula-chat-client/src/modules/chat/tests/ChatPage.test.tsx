import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, delay, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router';
import {
  getGetConversationMockHandler,
  getListConversationsMockHandler,
} from '@/libs/api/generated/conversations/conversations.msw';
import { getListMessagesMockHandler } from '@/libs/api/generated/messages/messages.msw';
import { ChatPage } from '@/modules/chat/ChatPage';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { toaster } from '@/shared/components/ui/toaster';
import { resources } from '@/resources';
import { renderWithChakra } from '@/test/render';
import { API_ROUTE, mockApiError } from '@/test/api';
import { aSession, mockGetSession } from '@/test/auth';
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

const CONVERSATION_ID = '11111111-1111-4111-8111-111111111111';

const aConversation = (id: string, title: string) => ({
  id,
  title,
  createdAt: '2026-06-15T11:00:00.000Z',
});

const aMessage = (id: string, role: string, content: string) => ({
  id,
  conversationId: CONVERSATION_ID,
  role,
  content,
  tokenCount: null,
  cached: false,
  createdAt: '2026-06-15T11:00:00.000Z',
});

const serveConversations = (...conversations: ReturnType<typeof aConversation>[]) =>
  server.use(getListConversationsMockHandler({ conversations, nextCursor: null, hasMore: false }));

// Rendered inside real <Routes> so ChatContainer's useParams() sees the id —
// a bare MemoryRouter would leave it undefined and always show the empty state.
const renderPage = (route = '/') =>
  renderWithChakra(
    <Routes>
      <Route path="/" element={<ChatPage />} />
      <Route path="/c/:id" element={<ChatPage />} />
    </Routes>,
    { route },
  );

beforeEach(() => {
  vi.restoreAllMocks();
  serveConversations();
  server.use(
    mockGetSession(aSession()),
    getGetConversationMockHandler(aConversation(CONVERSATION_ID, 'Chat')),
    getListMessagesMockHandler([]),
  );
  useMessageStore.setState({ message: '' });
  useChatStreamStore.setState({
    history: [],
    isStreaming: false,
    isPostStreamNavigation: false,
    error: null,
    usage: null,
    conversationId: undefined,
  });
});

describe('ChatPage', () => {
  it('welcomes the user on a brand new chat', async () => {
    renderPage();

    expect(await screen.findByText(resources.chat.welcomeMessage)).toBeInTheDocument();
  });

  it('renders the composer', async () => {
    renderPage();

    expect(await screen.findByRole('textbox', { name: '' })).toBeInTheDocument();
  });

  it('lists the conversations the API returns on a desktop layout', async () => {
    serveConversations(aConversation('a', 'Earlier chat'));

    renderPage();

    expect(await screen.findByText('Earlier chat')).toBeInTheDocument();
  });

  it('shows the empty-list hint when there are no conversations', async () => {
    renderPage();

    expect(await screen.findByText(resources.conversations.empty)).toBeInTheDocument();
  });

  it('shows loading skeletons while conversations load', async () => {
    server.use(
      getListConversationsMockHandler(async () => {
        await delay('infinite');
        return { conversations: [], nextCursor: null, hasMore: false };
      }),
    );

    const { container } = renderPage();

    await waitFor(() =>
      expect(container.querySelectorAll('.chakra-skeleton').length).toBeGreaterThan(0),
    );
  });

  it('shows the error in the sidebar when the conversations fail to load', async () => {
    server.use(
      mockApiError('get', API_ROUTE.conversations, 401, {
        success: false,
        error: 'Unauthorized',
        message: 'No authenticated session',
      }),
    );

    renderPage();

    expect(await screen.findByText('No authenticated session')).toBeInTheDocument();
  });

  it('renders the messages of an open conversation', async () => {
    server.use(
      getListMessagesMockHandler([
        aMessage('m1', 'user', 'a question'),
        aMessage('m2', 'assistant', 'an answer'),
      ]),
    );

    renderPage(`/c/${CONVERSATION_ID}`);

    expect(await screen.findByText('a question', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText('an answer')).toBeInTheDocument();
  });

  it('surfaces a conversation load failure inline and through the toaster', async () => {
    const toast = vi.spyOn(toaster, 'create');
    server.use(
      mockApiError('get', API_ROUTE.conversation, 404, {
        success: false,
        error: 'NotFound',
        message: 'Conversation not found',
      }),
    );

    renderPage(`/c/${CONVERSATION_ID}`);

    expect(
      await screen.findByText(resources.conversations.single.error, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Conversation not found')).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', description: 'Conversation not found' }),
    );
  });

  it('shows a conversation created by a reply in the sidebar without a refresh', async () => {
    let created = false;
    server.use(
      getListConversationsMockHandler(() => ({
        conversations: created ? [aConversation(CONVERSATION_ID, 'Brand new chat')] : [],
        nextCursor: null,
        hasMore: false,
      })),
      http.post(API_ROUTE.chatStream, () => {
        created = true;
        return new HttpResponse(
          `event: conversation-created\ndata: ${JSON.stringify({ conversationId: CONVERSATION_ID })}\n\n` +
            `event: token\ndata: ${JSON.stringify({ token: 'hi there' })}\n\n` +
            'event: end\ndata: {}\n\n',
          { headers: { 'Content-Type': 'text/event-stream' } },
        );
      }),
    );
    renderPage();
    expect(await screen.findByText(resources.conversations.empty)).toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox', { name: '' }), 'hello{Enter}');

    expect(await screen.findByText('Brand new chat')).toBeInTheDocument();
  });

  it('renders on a mobile layout without the side panels', async () => {
    layout.isMobile = true;
    layout.showSidePanels = false;

    renderPage();

    expect(await screen.findByText(resources.chat.welcomeMessage)).toBeInTheDocument();

    layout.isMobile = false;
    layout.showSidePanels = true;
  });
});
