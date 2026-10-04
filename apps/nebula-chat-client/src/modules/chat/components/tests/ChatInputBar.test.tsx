import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatInputBar } from '@/modules/chat/components/ChatInputBar';
import { useChatStream } from '@/modules/chat/hooks/useChatStream';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { useModelSelectorStore } from '@/modules/chat/stores/useModelSelectorStore';
import { resources } from '@/resources';
import { route } from '@/routing/routes';
import { API_ROUTE } from '@/test/api';
import { aSession, mockGetSession, refreshSession } from '@/test/auth';
import { server } from '@/test/msw';
import { renderWithChakra } from '@/test/render';

beforeEach(() => {
  vi.clearAllMocks();
  useMessageStore.setState({ message: '' });
  useModelSelectorStore.setState({ isSelectOpen: false, triggerWidth: 120 });
  useChatStreamStore.setState({ history: [], isMessageAllowanceReached: false });
  server.use(mockGetSession(aSession()));
});

// The bar wired to the real chat-send path, as ChatContainer wires it.
const ConnectedChatInputBar = () => {
  const { streamMessage } = useChatStream();
  return (
    <ChatInputBar
      onSend={(content) =>
        void streamMessage({
          model: 'gpt-4o-mini',
          messages: [{ id: crypto.randomUUID(), role: 'user', content }],
        })
      }
      isLoading={false}
      selectedModel="gpt-4o-mini"
      onModelChange={vi.fn()}
    />
  );
};

describe('ChatInputBar', () => {
  it('renders the composer', () => {
    renderWithChakra(
      <ChatInputBar
        onSend={vi.fn()}
        isLoading={false}
        selectedModel="gpt-4o-mini"
        onModelChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('forwards a sent message to onSend', async () => {
    const onSend = vi.fn();
    renderWithChakra(
      <ChatInputBar
        onSend={onSend}
        isLoading={false}
        selectedModel="gpt-4o-mini"
        onModelChange={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByRole('textbox'), 'hello');
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(onSend).toHaveBeenCalledWith('hello');
  });

  it('asks a Guest at the message allowance to register, then sends once they have', async () => {
    let isRegistered = false;
    let sends = 0;
    server.use(
      mockGetSession(() => aSession({ isAnonymous: !isRegistered })),
      http.post(API_ROUTE.chatStream, () => {
        sends += 1;
        return isRegistered
          ? new HttpResponse('event: end\ndata: {}\n\n', {
              headers: { 'Content-Type': 'text/event-stream' },
            })
          : HttpResponse.json(
              {
                success: false,
                error: 'MessageAllowanceReached',
                message: 'Message allowance exceeded: a Guest can send at most 10 messages.',
              },
              { status: 403 },
            );
      }),
    );
    renderWithChakra(<ConnectedChatInputBar />);
    refreshSession();

    await userEvent.type(screen.getByRole('textbox'), 'hello');
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    const prompt = await screen.findByRole('alert');
    expect(prompt).toHaveTextContent(resources.chat.messageAllowance.title);
    expect(
      screen.getByRole('link', { name: resources.chat.messageAllowance.action }),
    ).toHaveAttribute('href', route.auth.root());
    expect(screen.getByRole('textbox')).toHaveValue('hello');

    isRegistered = true;
    refreshSession();
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => expect(sends).toBe(2));
    await waitFor(() => expect(useChatStreamStore.getState().isStreaming).toBe(false));
    expect(useChatStreamStore.getState().isMessageAllowanceReached).toBe(false);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
