import { act, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import {
  getGetConversationQueryKey,
  getListConversationsInfiniteQueryKey,
} from '@/libs/api/generated/conversations/conversations';
import { getListMessagesQueryKey } from '@/libs/api/generated/messages/messages';
import { useChatStream } from '@/modules/chat/hooks/useChatStream';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { resources } from '@/resources';
import { API_ROUTE, mockApiError } from '@/test/api';
import { server } from '@/test/msw';
import { createTestQueryClient, renderHookWithQueryClient } from '@/test/render';

const navigate = vi.fn();

vi.mock('react-router', () => ({ useNavigate: () => navigate }));

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
    isMessageAllowanceReached: false,
  });
  useMessageStore.setState({ message: '' });
});

describe('useChatStream — token streaming', () => {
  it('accumulates tokens into the trailing assistant message', async () => {
    streamFrames(
      frame('token', { token: '2+2' }),
      frame('token', { token: ' is 4' }),
      frame('end', {}),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(assistantContent()).toBe('2+2 is 4'));
  });

  it('seeds an empty assistant message before the first token arrives', async () => {
    streamFrames(frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(history()).toHaveLength(2);
    expect(history().at(-1)?.role).toBe('assistant');
  });

  it('reassembles a frame split across chunk boundaries', async () => {
    // The reader hands back arbitrary byte slices, so the parser must buffer
    // a partial line rather than dropping it.
    streamFrames('event: token\ndata: {"tok', 'en":"split"}\n\n', frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(assistantContent()).toBe('split'));
  });

  it('stops streaming once the end event arrives', async () => {
    streamFrames(frame('token', { token: 'x' }), frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(useChatStreamStore.getState().isStreaming).toBe(false));
  });

  it('ignores an event name outside the known set', async () => {
    streamFrames(frame('sneaky', { token: 'nope' }), frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(assistantContent()).toBe('');
  });

  it('skips a data line that is not valid JSON', async () => {
    streamFrames(
      'event: token\ndata: not json\n\n',
      frame('token', { token: 'ok' }),
      frame('end', {}),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(assistantContent()).toBe('ok'));
  });

  it('ignores a token payload that is not a string', async () => {
    streamFrames(frame('token', { token: 42 }), frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

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
    const { result } = renderHookWithQueryClient(() => useChatStream());

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
    const { result } = renderHookWithQueryClient(() => useChatStream());

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
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    await waitFor(() =>
      expect(useChatStreamStore.getState().error).toBe(resources.chat.streamError),
    );
  });

  it('stops streaming after an error', async () => {
    streamFrames(frame('error', { success: false, error: 'Internal', message: 'boom' }));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(useChatStreamStore.getState().isStreaming).toBe(false));
  });

  it('reports a non-OK response without an envelope with the generic message', async () => {
    server.use(http.post(ENDPOINT, () => new HttpResponse(null, { status: 500 })));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    await waitFor(() =>
      expect(useChatStreamStore.getState().error).toBe(resources.chat.streamError),
    );
  });

  it('reports a rejected request by the message of its error envelope', async () => {
    server.use(
      mockApiError('post', ENDPOINT, 429, {
        success: false,
        error: 'TooManyRequests',
        message: 'Rate limit exceeded. Retry after 500ms.',
      }),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    await waitFor(() =>
      expect(useChatStreamStore.getState().error).toBe('Rate limit exceeded. Retry after 500ms.'),
    );
  });
});

describe('useChatStream — message allowance', () => {
  const allowanceEnvelope = {
    success: false,
    error: 'MessageAllowanceReached',
    message: 'Message allowance exceeded: a Guest can send at most 10 messages.',
  };

  it('flags the reached allowance instead of reporting a generic error', async () => {
    server.use(mockApiError('post', ENDPOINT, 403, allowanceEnvelope));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(useChatStreamStore.getState()).toMatchObject({
      isMessageAllowanceReached: true,
      isStreaming: false,
      error: null,
    });
  });

  it('returns the refused message to the composer instead of the history', async () => {
    server.use(mockApiError('post', ENDPOINT, 403, allowanceEnvelope));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(history()).toEqual([]);
    expect(useMessageStore.getState().message).toBe('what is 2+2?');
  });

  it('treats a 403 without an envelope as the reached allowance', async () => {
    server.use(http.post(ENDPOINT, () => new HttpResponse(null, { status: 403 })));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(useChatStreamStore.getState().isMessageAllowanceReached).toBe(true);
  });

  it('reports a plain Forbidden as an error, not the reached allowance', async () => {
    server.use(
      mockApiError('post', ENDPOINT, 403, {
        success: false,
        error: 'Forbidden',
        message: 'Forbidden.',
      }),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(useChatStreamStore.getState().error).toBe('Forbidden.'));
    expect(useChatStreamStore.getState().isMessageAllowanceReached).toBe(false);
  });

  it('clears the reached allowance once a later send goes through', async () => {
    useChatStreamStore.setState({ isMessageAllowanceReached: true });
    streamFrames(frame('token', { token: 'welcome back' }), frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(useChatStreamStore.getState().isMessageAllowanceReached).toBe(false);
    await waitFor(() => expect(assistantContent()).toBe('welcome back'));
  });
});

describe('useChatStream — conversation creation', () => {
  const NEW_ID = '11111111-1111-4111-8111-111111111111';

  it('adopts the conversation id the server assigns', async () => {
    streamFrames(frame('conversation-created', { conversationId: NEW_ID }), frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(useChatStreamStore.getState().conversationId).toBe(NEW_ID));
  });

  it('navigates to the new conversation once the stream ends', async () => {
    streamFrames(frame('conversation-created', { conversationId: NEW_ID }), frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(`/c/${NEW_ID}`, { replace: true }));
  });

  it('does not navigate when continuing an existing conversation', async () => {
    useChatStreamStore.setState({ conversationId: 'existing-id' });
    streamFrames(frame('conversation-created', { conversationId: NEW_ID }), frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(useChatStreamStore.getState().isStreaming).toBe(false));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps isStreaming true through the post-stream navigation window', async () => {
    // Dropping it here would render a frame with no conversation and no stream,
    // which shows as an empty-state flicker.
    streamFrames(frame('conversation-created', { conversationId: NEW_ID }), frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    await waitFor(() => expect(useChatStreamStore.getState().isPostStreamNavigation).toBe(true));
    expect(useChatStreamStore.getState().isStreaming).toBe(true);
  });

  it('ignores a conversation-created frame with no id', async () => {
    streamFrames(frame('conversation-created', {}), frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(useChatStreamStore.getState().conversationId).toBeUndefined();
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('useChatStream — query cache', () => {
  const NEW_ID = '11111111-1111-4111-8111-111111111111';
  const EXISTING_ID = '44444444-4444-4444-8444-444444444444';

  /** A query client holding fresh data for `keys`, so invalidation is observable. */
  const primedClient = (...keys: QueryKey[]) => {
    const queryClient = createTestQueryClient();
    for (const key of keys) queryClient.setQueryData(key, []);
    return queryClient;
  };

  const isInvalidated = (queryClient: QueryClient, key: QueryKey) =>
    queryClient.getQueryState(key)?.isInvalidated;

  it('refreshes the sidebar as soon as the server creates a conversation', async () => {
    // No `end` frame: the list must refresh on creation, not only on completion.
    streamFrames(frame('conversation-created', { conversationId: NEW_ID }));
    const queryClient = primedClient(getListConversationsInfiniteQueryKey());
    const { result } = renderHookWithQueryClient(() => useChatStream(), { queryClient });

    await sendMessage(result);

    expect(isInvalidated(queryClient, getListConversationsInfiniteQueryKey())).toBe(true);
  });

  it('invalidates the list, the conversation and its messages when the stream completes', async () => {
    useChatStreamStore.setState({ conversationId: EXISTING_ID });
    streamFrames(frame('token', { token: 'x' }), frame('end', {}));
    const queryClient = primedClient(
      getListConversationsInfiniteQueryKey(),
      getGetConversationQueryKey(EXISTING_ID),
      getListMessagesQueryKey(),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream(), { queryClient });

    await sendMessage(result);

    expect(isInvalidated(queryClient, getListConversationsInfiniteQueryKey())).toBe(true);
    expect(isInvalidated(queryClient, getGetConversationQueryKey(EXISTING_ID))).toBe(true);
    expect(isInvalidated(queryClient, getListMessagesQueryKey())).toBe(true);
  });

  it('leaves the cache alone when the stream fails', async () => {
    useChatStreamStore.setState({ conversationId: EXISTING_ID });
    streamFrames(frame('error', { success: false, error: 'Internal', message: 'boom' }));
    const queryClient = primedClient(getListMessagesQueryKey());
    const { result } = renderHookWithQueryClient(() => useChatStream(), { queryClient });

    await sendMessage(result);

    expect(isInvalidated(queryClient, getListMessagesQueryKey())).toBe(false);
  });
});

describe('useChatStream — lifecycle', () => {
  it('clearPostStream drops both streaming flags together', async () => {
    useChatStreamStore.setState({ isStreaming: true, isPostStreamNavigation: true });
    const { result } = renderHookWithQueryClient(() => useChatStream());

    act(() => result.current.clearPostStream());

    expect(useChatStreamStore.getState()).toMatchObject({
      isStreaming: false,
      isPostStreamNavigation: false,
    });
  });

  it('abort stops the stream without recording an error', async () => {
    streamFrames(frame('token', { token: 'x' }), frame('end', {}));
    const { result } = renderHookWithQueryClient(() => useChatStream());

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
    const { result } = renderHookWithQueryClient(() => useChatStream());

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

  it('sends the session cookie with the stream request', async () => {
    let credentials: RequestCredentials | undefined;
    server.use(
      http.post(ENDPOINT, ({ request }) => {
        credentials = request.credentials;
        return new HttpResponse(frame('end', {}), {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      }),
    );
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(credentials).toBe('include');
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
    const { result } = renderHookWithQueryClient(() => useChatStream());

    await sendMessage(result);

    expect(received?.conversationId).toBe('existing-id');
  });
});
