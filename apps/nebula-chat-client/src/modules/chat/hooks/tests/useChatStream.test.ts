import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatStream } from '@/modules/chat/hooks/useChatStream';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { resources } from '@/resources';
import { API_ROUTE } from '@/test/api';
import { server } from '@/test/msw';

const navigate = vi.fn();
const refetch = vi.fn();
const prependConversation = vi.fn();

vi.mock('react-router', () => ({ useNavigate: () => navigate }));

vi.mock('@/modules/conversations/stores/useConversationsStore', () => ({
  useConversationsStore: (selector: (s: unknown) => unknown) =>
    selector({ refetch, prependConversation }),
}));

const ENDPOINT = API_ROUTE.chatStream;

/** Serves `frames` as a streamed SSE response, one chunk per frame. */
const streamFrames = (...frames: string[]) => {
  server.use(
    http.post(ENDPOINT, () => {
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          for (const frame of frames) controller.enqueue(encoder.encode(frame));
          controller.close();
        },
      });
      return new HttpResponse(stream, {
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }),
  );
};

const frame = (event: string, data: unknown) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

const sendMessage = async (result: { current: ReturnType<typeof useChatStream> }) => {
  await act(async () => {
    await result.current.streamMessage({
      model: 'gpt-4o-mini',
      messages: [{ id: 'u1', role: 'user', content: 'what is 2+2?' }],
    });
  });
};

const history = () => useChatStreamStore.getState().history;
const assistantContent = () => history().at(-1)?.content;

beforeEach(() => {
  vi.clearAllMocks();
  useChatStreamStore.setState({
    history: [],
    isStreaming: false,
    isPostStreamNavigation: false,
    error: null,
    usage: null,
    conversationId: undefined,
  });
});

describe('useChatStream — token streaming', () => {
  it('accumulates tokens into the trailing assistant message', async () => {
    streamFrames(
      frame('token', { token: '2+2' }),
      frame('token', { token: ' is 4' }),
      frame('end', {}),
    );
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(assistantContent()).toBe('2+2 is 4'));
  });

  it('seeds an empty assistant message before the first token arrives', async () => {
    streamFrames(frame('end', {}));
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    expect(history()).toHaveLength(2);
    expect(history().at(-1)?.role).toBe('assistant');
  });

  it('reassembles a frame split across chunk boundaries', async () => {
    // The reader hands back arbitrary byte slices, so the parser must buffer
    // a partial line rather than dropping it.
    streamFrames('event: token\ndata: {"tok', 'en":"split"}\n\n', frame('end', {}));
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(assistantContent()).toBe('split'));
  });

  it('stops streaming once the end event arrives', async () => {
    streamFrames(frame('token', { token: 'x' }), frame('end', {}));
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(useChatStreamStore.getState().isStreaming).toBe(false));
  });

  it('ignores an event name outside the known set', async () => {
    streamFrames(frame('sneaky', { token: 'nope' }), frame('end', {}));
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    expect(assistantContent()).toBe('');
  });

  it('skips a data line that is not valid JSON', async () => {
    streamFrames(
      'event: token\ndata: not json\n\n',
      frame('token', { token: 'ok' }),
      frame('end', {}),
    );
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(assistantContent()).toBe('ok'));
  });

  it('ignores a token payload that is not a string', async () => {
    streamFrames(frame('token', { token: 42 }), frame('end', {}));
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    expect(assistantContent()).toBe('');
  });
});

describe('useChatStream — usage and errors', () => {
  it('records the reported usage', async () => {
    streamFrames(
      frame('usage', { promptTokens: 10, completionTokens: 4, totalTokens: 14 }),
      frame('end', {}),
    );
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    await waitFor(() =>
      expect(useChatStreamStore.getState().usage).toEqual({
        promptTokens: 10,
        completionTokens: 4,
        totalTokens: 14,
      }),
    );
  });

  it('surfaces the message of an error-envelope frame in place of the reply', async () => {
    streamFrames(
      frame('error', {
        success: false,
        error: 'TooManyRequests',
        message: 'Rate limit exceeded. Retry after 500ms.',
      }),
    );
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => {
      expect(useChatStreamStore.getState().error).toBe('Rate limit exceeded. Retry after 500ms.');
      expect(assistantContent()).toBe('Rate limit exceeded. Retry after 500ms.');
    });
  });

  it.each([
    ['carries no envelope', {}],
    ['is in the retired `{ error }` shape', { error: 'Rate limit exceeded.' }],
  ])('falls back to a generic message when the error frame %s', async (_label, data) => {
    streamFrames(frame('error', data));
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    await waitFor(() =>
      expect(useChatStreamStore.getState().error).toBe(resources.chat.streamError),
    );
  });

  it('stops streaming after an error', async () => {
    streamFrames(frame('error', { success: false, error: 'Internal', message: 'boom' }));
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(useChatStreamStore.getState().isStreaming).toBe(false));
  });

  it('reports a non-OK response without an envelope with the generic message', async () => {
    server.use(http.post(ENDPOINT, () => new HttpResponse(null, { status: 500 })));
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    await waitFor(() =>
      expect(useChatStreamStore.getState().error).toBe(resources.chat.streamError),
    );
  });

  it('reports a rejected request by the message of its error envelope', async () => {
    server.use(
      http.post(ENDPOINT, () =>
        HttpResponse.json(
          {
            success: false,
            error: 'MessageAllowanceReached',
            message: 'Guest message allowance reached. Register or sign in to continue.',
            details: { limit: 10, count: 10 },
          },
          { status: 403 },
        ),
      ),
    );
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    await waitFor(() =>
      expect(useChatStreamStore.getState().error).toBe(
        'Guest message allowance reached. Register or sign in to continue.',
      ),
    );
  });
});

describe('useChatStream — conversation creation', () => {
  const NEW_ID = '11111111-1111-4111-8111-111111111111';

  it('adopts the conversation id the server assigns', async () => {
    streamFrames(frame('conversation-created', { conversationId: NEW_ID }), frame('end', {}));
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(useChatStreamStore.getState().conversationId).toBe(NEW_ID));
  });

  it('adds the new conversation to the sidebar straight away', async () => {
    streamFrames(frame('conversation-created', { conversationId: NEW_ID }), frame('end', {}));
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    await waitFor(() =>
      expect(prependConversation).toHaveBeenCalledWith(expect.objectContaining({ id: NEW_ID })),
    );
  });

  it('navigates to the new conversation once the stream ends', async () => {
    streamFrames(frame('conversation-created', { conversationId: NEW_ID }), frame('end', {}));
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(`/c/${NEW_ID}`, { replace: true }));
  });

  it('refreshes the conversation list after navigating', async () => {
    streamFrames(frame('conversation-created', { conversationId: NEW_ID }), frame('end', {}));
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(refetch).toHaveBeenCalled());
  });

  it('does not navigate when continuing an existing conversation', async () => {
    useChatStreamStore.setState({ conversationId: 'existing-id' });
    streamFrames(frame('conversation-created', { conversationId: NEW_ID }), frame('end', {}));
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(useChatStreamStore.getState().isStreaming).toBe(false));
    expect(navigate).not.toHaveBeenCalled();
    expect(prependConversation).not.toHaveBeenCalled();
  });

  it('keeps isStreaming true through the post-stream navigation window', async () => {
    // Dropping it here would render a frame with no conversation and no stream,
    // which shows as an empty-state flicker.
    streamFrames(frame('conversation-created', { conversationId: NEW_ID }), frame('end', {}));
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(useChatStreamStore.getState().isPostStreamNavigation).toBe(true));
    expect(useChatStreamStore.getState().isStreaming).toBe(true);
  });

  it('ignores a conversation-created frame with no id', async () => {
    streamFrames(frame('conversation-created', {}), frame('end', {}));
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    expect(prependConversation).not.toHaveBeenCalled();
  });
});

describe('useChatStream — lifecycle', () => {
  it('clearPostStream drops both streaming flags together', async () => {
    useChatStreamStore.setState({ isStreaming: true, isPostStreamNavigation: true });
    const { result } = renderHook(() => useChatStream());

    act(() => result.current.clearPostStream());

    expect(useChatStreamStore.getState()).toMatchObject({
      isStreaming: false,
      isPostStreamNavigation: false,
    });
  });

  it('abort stops the stream without recording an error', async () => {
    streamFrames(frame('token', { token: 'x' }), frame('end', {}));
    const { result } = renderHook(() => useChatStream());

    act(() => result.current.abort());

    expect(useChatStreamStore.getState().isStreaming).toBe(false);
    expect(useChatStreamStore.getState().error).toBeNull();
  });

  it('sends only the newest message, with the model', async () => {
    let received: { messages: unknown[]; model: string } | undefined;
    server.use(
      http.post(ENDPOINT, async ({ request }) => {
        received = (await request.json()) as { messages: unknown[]; model: string };
        return new HttpResponse(frame('end', {}), {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      }),
    );
    const { result } = renderHook(() => useChatStream());

    await act(async () => {
      await result.current.streamMessage({
        model: 'gpt-4o',
        messages: [
          { id: 'u1', role: 'user', content: 'older' },
          { id: 'u2', role: 'user', content: 'newest' },
        ],
      });
    });

    expect(received?.model).toBe('gpt-4o');
    expect(received?.messages).toHaveLength(1);
  });

  it('includes the conversation id when one is already active', async () => {
    let received: { conversationId?: string } | undefined;
    server.use(
      http.post(ENDPOINT, async ({ request }) => {
        received = (await request.json()) as { conversationId?: string };
        return new HttpResponse(frame('end', {}), {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      }),
    );
    useChatStreamStore.setState({ conversationId: 'existing-id' });
    const { result } = renderHook(() => useChatStream());

    await sendMessage(result);

    expect(received?.conversationId).toBe('existing-id');
  });
});
