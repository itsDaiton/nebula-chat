import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getGetMessageAllowanceMockHandler } from '@/libs/api/generated/chat/chat.msw';
import { ChatInputBar } from '@/modules/chat/components/ChatInputBar';
import { useChatStream } from '@/modules/chat/hooks/useChatStream';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { resources } from '@/resources';
import { API_ROUTE } from '@/test/api';
import { aSession, mockGetSession, refreshSession } from '@/test/auth';
import { aMeteredAllowance } from '@/test/allowance';
import { mockReplyStream, sseFrame } from '@/test/chat';
import { server } from '@/test/msw';
import { renderInRouter } from '@/test/renderRoute';

const SESSION_ID = '11111111-1111-4111-8111-111111111111';

// The send accepted: the Message is persisted and its reply is on this stream.
const accepted = () =>
  HttpResponse.json(
    {
      messageId: '22222222-2222-4222-8222-222222222222',
      streamId: '33333333-3333-4333-8333-333333333333',
    },
    { status: 202 },
  );

beforeEach(() => {
  vi.clearAllMocks();
  useMessageStore.setState({ message: '' });
  // An open Session, so a send goes straight to it.
  useChatStreamStore.setState({
    history: [],
    isMessageAllowanceReached: false,
    sessionId: SESSION_ID,
  });
  server.use(
    mockGetSession(aSession()),
    getGetMessageAllowanceMockHandler(aMeteredAllowance(5)),
    mockReplyStream(sseFrame('end', {})),
  );
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
  it('renders the composer', async () => {
    await renderInRouter(
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
    await renderInRouter(
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

  it('asks a Guest at the message allowance to register, then sends once verified', async () => {
    let isRegistered = false;
    let sends = 0;
    server.use(
      // Only a verified Registered user is uncapped (ADR-0021).
      mockGetSession(() => aSession({ isAnonymous: !isRegistered, emailVerified: isRegistered })),
      http.post(API_ROUTE.sendMessage, () => {
        sends += 1;
        return isRegistered
          ? accepted()
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
    await renderInRouter(<ConnectedChatInputBar />);
    refreshSession();

    await userEvent.type(screen.getByRole('textbox'), 'hello');
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    const prompt = await screen.findByRole('alert');
    expect(prompt).toHaveTextContent(resources.chat.messageAllowance.title);
    expect(
      screen.getByRole('link', { name: resources.chat.messageAllowance.action }),
    ).toHaveAttribute('href', '/auth');
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

  it('counts a Guest down as messages are sent, then walls them off at zero with the draft kept', async () => {
    let remaining = 2;
    server.use(
      getGetMessageAllowanceMockHandler(() => aMeteredAllowance(remaining)),
      http.post(API_ROUTE.sendMessage, () => {
        remaining -= 1;
        return accepted();
      }),
    );
    await renderInRouter(<ConnectedChatInputBar />);
    refreshSession();

    expect(await screen.findByRole('status')).toHaveTextContent('2 of 10 messages left');

    await userEvent.type(screen.getByRole('textbox'), 'first');
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('1 of 10 message left'),
    );
    await waitFor(() => expect(useChatStreamStore.getState().isStreaming).toBe(false));

    await userEvent.type(screen.getByRole('textbox'), 'second');
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    const wall = await screen.findByRole('alert');
    expect(wall).toHaveTextContent(resources.chat.messageAllowance.title);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox'), 'draft');
    expect(screen.getByRole('textbox')).toBeEnabled();
    expect(screen.getByRole('textbox')).toHaveValue('draft');
  });
});
