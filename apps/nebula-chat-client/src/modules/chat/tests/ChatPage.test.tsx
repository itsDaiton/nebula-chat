import { screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router';
import { getListConversationsMockHandler } from '@/libs/api/generated/conversations/conversations.msw';
import { ChatPage } from '@/modules/chat/ChatPage';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { ConversationsProvider } from '@/modules/conversations/providers/ConversationsProvider';
import { useConversationStore } from '@/modules/conversations/stores/useConversationStore';
import { useConversationsStore } from '@/modules/conversations/stores/useConversationsStore';
import { resources } from '@/resources';
import { renderWithChakra } from '@/test/render';
import { API_ROUTE } from '@/test/api';
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

// Rendered inside real <Routes> so ChatContainer's useParams() sees the id —
// a bare MemoryRouter would leave it undefined and always show the empty state.
const renderPage = (route = '/') =>
  renderWithChakra(
    <ConversationsProvider>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/c/:id" element={<ChatPage />} />
      </Routes>
    </ConversationsProvider>,
    { route },
  );

beforeEach(() => {
  vi.clearAllMocks();
  server.use(
    getListConversationsMockHandler({ conversations: [], nextCursor: null, hasMore: false }),
    // Hand-written rather than generated: `messages` is not in the documented
    // response for this endpoint, so the generated handler's payload type
    // rejects it. That gap is a real bug, pinned in
    // `modules/chat/stores/tests/chatConversationSync.test.ts`.
    http.get(API_ROUTE.conversation, () =>
      HttpResponse.json({
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Chat',
        messages: [],
      }),
    ),
  );
  useConversationsStore.setState({
    conversations: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    nextCursor: null,
    hasMore: false,
  });
  useConversationStore.setState({
    conversationId: null,
    conversation: null,
    isLoading: false,
    error: null,
  });
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

  it('renders the conversation list panel on a desktop layout', async () => {
    useConversationsStore.setState({
      conversations: [{ id: 'a', title: 'Earlier chat', createdAt: '2026-06-15T11:00:00.000Z' }],
    });

    renderPage();

    expect(await screen.findByText('Earlier chat')).toBeInTheDocument();
  });

  it('shows the empty-list hint when there are no conversations', async () => {
    renderPage();

    expect(await screen.findByText(resources.conversations.empty)).toBeInTheDocument();
  });

  it('shows loading skeletons while conversations load', async () => {
    useConversationsStore.setState({ isLoading: true });

    const { container } = renderPage();

    await waitFor(() =>
      expect(container.querySelectorAll('.chakra-skeleton').length).toBeGreaterThan(0),
    );
  });

  it('renders the messages of an open conversation', async () => {
    // Served from the API rather than preset on the store: chatConversationSync
    // rewrites history from the fetched conversation, so a preset would be
    // overwritten the moment the fetch lands.
    server.use(
      http.get(API_ROUTE.conversation, () =>
        HttpResponse.json({
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Chat',
          messages: [
            { id: 'm1', role: 'user', content: 'a question' },
            { id: 'm2', role: 'assistant', content: 'an answer' },
          ],
        }),
      ),
    );

    renderPage('/c/11111111-1111-4111-8111-111111111111');

    expect(await screen.findByText('a question', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText('an answer')).toBeInTheDocument();
  });

  it('surfaces a conversation load failure', async () => {
    server.use(
      http.get(API_ROUTE.conversation, () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 }),
      ),
    );

    renderPage('/c/11111111-1111-4111-8111-111111111111');

    expect(
      await screen.findByText(resources.conversations.single.error, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
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
